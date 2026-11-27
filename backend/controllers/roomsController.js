const Room = require('../models/Room');
const Challenge = require('../models/Challenge');
const Kudos = require('../models/Kudos');
const User = require('../models/User');
const GithubStats = require('../models/GithubStats');
const { freshStats } = require('./githubController');
const svc = require('../services/roomsService');

const fail = (res, err) => {
  console.error('rooms error:', err.message);
  res.status(500).json({ error: 'Something went wrong.' });
};
const bad = (res, error, status = 400) => res.status(status).json({ error });
const isOwner = (room, uid) => room.ownerUid === uid;

/** The room if `uid` is a member, else null (non-members get a 404 either way, so codes don't leak). */
const findMyRoom = (code, uid) => (svc.isValidCode(code) ? Room.findOne({ code, 'members.uid': uid }) : null);
const withRoom = (handler) => async (req, res) => {
  try {
    const room = await findMyRoom(req.params.code, req.user.uid);
    if (!room) return bad(res, 'Room not found.', 404);
    await handler(req, res, room);
  } catch (err) { fail(res, err); }
};

/** Public profile bits only: display name, avatar, GitHub handle. */
const memberFor = async (uid) => {
  const u = await User.findOne({ uid }, { displayName: 1, photoURL: 1, githubUsername: 1 });
  return {
    uid,
    name: (u?.displayName || u?.githubUsername || 'Developer').slice(0, 60),
    photoURL: u?.photoURL || '',
    githubUsername: u?.githubUsername || '',
    joinedAt: new Date(),
    lastSeen: new Date(),
  };
};

const roomCount = (uid) => Room.countDocuments({ 'members.uid': uid });

/** GET /api/rooms */
const listRooms = async (req, res) => {
  try {
    const now = Date.now();
    const rooms = await Room.find({ 'members.uid': req.user.uid }).sort({ updatedAt: -1 });
    res.json(rooms.map((r) => {
      const p = svc.publicRoom(r, now);
      return {
        code: p.code, name: p.name, emoji: p.emoji, color: p.color, isOwner: isOwner(r, req.user.uid),
        memberCount: p.members.length,
        onlineCount: p.members.filter((m) => m.presence !== 'offline').length,
        members: p.members.slice(0, 6).map(({ uid, name, photoURL, presence }) => ({ uid, name, photoURL, presence })),
        timerActive: svc.timerRemaining(p.timer, now) > 0,
      };
    }));
  } catch (err) { fail(res, err); }
};

/** POST /api/rooms {name, emoji, color} */
const createRoom = async (req, res) => {
  try {
    const uid = req.user.uid;
    const name = svc.cleanText(req.body.name, svc.LIMITS.roomName);
    if (!name) return bad(res, `Room name is required (max ${svc.LIMITS.roomName} chars).`);
    const emoji = svc.EMOJIS.includes(req.body.emoji) ? req.body.emoji : svc.EMOJIS[0];
    const color = svc.COLORS.includes(req.body.color) ? req.body.color : 'accent';
    if (await roomCount(uid) >= svc.LIMITS.roomsPerUser) return bad(res, `You can be in at most ${svc.LIMITS.roomsPerUser} rooms.`);

    const member = await memberFor(uid);
    for (let i = 0; i < 5; i++) { // retry on the (very unlikely) code collision
      try {
        const room = await Room.create({ code: svc.generateCode(), name, emoji, color, ownerUid: uid, members: [member] });
        return res.status(201).json({ code: room.code });
      } catch (err) { if (err.code !== 11000) throw err; }
    }
    bad(res, 'Could not create room, try again.', 500);
  } catch (err) { fail(res, err); }
};

/** POST /api/rooms/join {code} */
const joinRoom = async (req, res) => {
  try {
    const uid = req.user.uid;
    const code = typeof req.body.code === 'string' ? req.body.code.trim().toUpperCase() : '';
    if (!svc.isValidCode(code)) return bad(res, 'That invite code doesn’t look right.');
    if (await Room.exists({ code, 'members.uid': uid })) return res.json({ code });
    if (await roomCount(uid) >= svc.LIMITS.roomsPerUser) return bad(res, `You can be in at most ${svc.LIMITS.roomsPerUser} rooms.`);

    // Atomic: only push if not already a member and under the cap
    const { modifiedCount } = await Room.updateOne(
      { code, 'members.uid': { $ne: uid }, [`members.${svc.LIMITS.members - 1}`]: { $exists: false } },
      { $push: { members: await memberFor(uid) } }
    );
    if (modifiedCount) return res.json({ code });
    if (!(await Room.exists({ code }))) return bad(res, 'No room with that code.', 404);
    bad(res, `This room is full (${svc.LIMITS.members} members).`);
  } catch (err) { fail(res, err); }
};

const roomMembersWithStats = async (room) => {
  const uids = room.members.map((m) => m.uid);
  const stats = await GithubStats.find(
    { uid: { $in: uids } },
    { uid: 1, calendar: 1, recentCommits: 1, pullRequests: 1 }
  ).lean();
  return Object.fromEntries(stats.map((s) => [s.uid, s]));
};

/** GET /api/rooms/:code – room + presence + feed + challenges with leaderboards + weekly board */
const getRoom = withRoom(async (req, res, room) => {
  const uid = req.user.uid;
  // Keep my own GitHub data fresh (cached for 1h); others refresh when they use the app.
  await freshStats(uid).catch(() => null);

  const now = Date.now();
  const [statsByUid, challenges] = await Promise.all([
    roomMembersWithStats(room),
    Challenge.find({ roomCode: room.code }).sort({ endDate: 1 }).lean(),
  ]);
  const pub = svc.publicRoom(room, now);
  const rows = pub.members.map(({ uid: id, name, photoURL, githubUsername }) =>
    ({ uid: id, name, photoURL, githubUsername, calendar: statsByUid[id]?.calendar || null }));

  const feedRaw = svc.buildFeed(pub.members, statsByUid, [], uid, now);
  const kudos = await Kudos.find({ roomCode: room.code, itemUrl: { $in: feedRaw.map((i) => i.url) } }, { itemUrl: 1, fromUid: 1 }).lean();
  const week = svc.weekWindow(now);

  res.json({
    me: uid,
    serverNow: now,
    room: pub,
    feed: svc.buildFeed(pub.members, statsByUid, kudos, uid, now),
    weekly: { ...week, leaderboard: svc.leaderboard(rows, 'contributions', week.start, week.end) },
    challenges: challenges.map((c) => ({
      id: c._id, title: c.title, metric: c.metric, target: c.target, startDate: c.startDate, endDate: c.endDate,
      createdBy: c.createdBy, status: svc.challengeStatus(c, now),
      leaderboard: svc.leaderboard(rows, c.metric, c.startDate, c.endDate, c.target),
    })),
  });
});

/** POST /api/rooms/:code/heartbeat {status?} – also the 15s presence poll */
const heartbeat = withRoom(async (req, res, room) => {
  const uid = req.user.uid;
  const me = room.members.find((m) => m.uid === uid);
  let status;
  if (req.body.status !== undefined) {
    status = svc.cleanText(req.body.status, svc.LIMITS.status, { allowEmpty: true });
    if (status === null) return bad(res, `Status must be at most ${svc.LIMITS.status} chars.`);
  }
  const statusChanged = status !== undefined && status !== me.status;
  // ponytail: presence via HTTP polling (Render free tier, no websockets); writes throttled to one per 10s
  if (statusChanged || !svc.heartbeatThrottled(me.lastSeen)) {
    const set = { 'members.$.lastSeen': new Date() };
    if (statusChanged) set['members.$.status'] = status;
    await Room.updateOne({ code: room.code, 'members.uid': uid }, { $set: set });
    me.lastSeen = set['members.$.lastSeen'];
    if (statusChanged) me.status = status;
  }
  res.json({ me: uid, serverNow: Date.now(), room: svc.publicRoom(room) });
});

/** POST /api/rooms/:code/leave – owner leaving hands the room to the longest-standing member */
const leaveRoom = withRoom(async (req, res, room) => {
  const uid = req.user.uid;
  const rest = room.members.filter((m) => m.uid !== uid);
  if (!rest.length) {
    await Promise.all([Room.deleteOne({ _id: room._id }), Challenge.deleteMany({ roomCode: room.code }), Kudos.deleteMany({ roomCode: room.code })]);
    return res.json({ ok: true, deleted: true });
  }
  const update = { $pull: { members: { uid } } };
  if (isOwner(room, uid)) update.$set = { ownerUid: [...rest].sort((a, b) => a.joinedAt - b.joinedAt)[0].uid };
  await Room.updateOne({ _id: room._id }, update);
  res.json({ ok: true });
});

/** DELETE /api/rooms/:code (owner) */
const deleteRoom = withRoom(async (req, res, room) => {
  if (!isOwner(room, req.user.uid)) return bad(res, 'Only the owner can delete this room.', 403);
  await Promise.all([Room.deleteOne({ _id: room._id }), Challenge.deleteMany({ roomCode: room.code }), Kudos.deleteMany({ roomCode: room.code })]);
  res.json({ ok: true });
});

/** DELETE /api/rooms/:code/members/:uid (owner) */
const removeMember = withRoom(async (req, res, room) => {
  if (!isOwner(room, req.user.uid)) return bad(res, 'Only the owner can remove members.', 403);
  if (req.params.uid === req.user.uid) return bad(res, 'Use “Leave room” instead.');
  await Room.updateOne({ _id: room._id }, { $pull: { members: { uid: String(req.params.uid) } } });
  res.json({ ok: true });
});

/** POST /api/rooms/:code/timer {minutes, label} starts a room session; {join:true} joins the running one */
const startTimer = withRoom(async (req, res, room) => {
  const uid = req.user.uid;
  const now = Date.now();
  if (req.body.join) {
    if (!(svc.timerRemaining(room.timer, now) > 0)) return bad(res, 'No session running.');
    await Room.updateOne({ code: room.code, 'members.uid': uid }, { $set: { 'members.$.focusUntil': svc.timerEnd(room.timer), 'members.$.lastSeen': new Date() } });
    return res.json({ ok: true });
  }
  const minutes = Number(req.body.minutes);
  if (!svc.TIMER_MINUTES.includes(minutes)) return bad(res, `Pick ${svc.TIMER_MINUTES.join(', ')} minutes.`);
  const label = req.body.label ? svc.cleanText(req.body.label, svc.LIMITS.challengeTitle) : '';
  if (label === null) return bad(res, `Label must be at most ${svc.LIMITS.challengeTitle} chars.`);

  const timer = { startedAt: new Date(now), minutes, startedBy: uid, label };
  // One atomic write: new timer, starter focusing, everyone else's old focus cleared
  await Room.updateOne(
    { _id: room._id },
    { $set: { timer, 'members.$[me].focusUntil': svc.timerEnd(timer), 'members.$[other].focusUntil': null } },
    { arrayFilters: [{ 'me.uid': uid }, { 'other.uid': { $ne: uid } }] }
  );
  res.json({ ok: true });
});

/** DELETE /api/rooms/:code/timer – any member can stop it */
const stopTimer = withRoom(async (req, res, room) => {
  // the room timer is the only source of focusUntil
  await Room.updateOne({ _id: room._id }, { $set: { timer: null, 'members.$[].focusUntil': null } });
  res.json({ ok: true });
});

/** PUT /api/rooms/:code/playlist {id, name, image} | {playlist: null} */
const setPlaylist = withRoom(async (req, res, room) => {
  const { value, error } = svc.validatePlaylist(req.body.playlist === null ? null : req.body);
  if (error) return bad(res, error);
  await Room.updateOne({ _id: room._id }, { $set: { playlist: value && { ...value, setBy: req.user.uid } } });
  res.json({ ok: true });
});

/** POST /api/rooms/:code/kudos {itemUrl} – toggles my kudos on a member's commit/PR */
const toggleKudos = withRoom(async (req, res, room) => {
  const { itemUrl } = req.body;
  if (!svc.isGithubUrl(itemUrl)) return bad(res, 'Invalid item.');
  const key = { roomCode: room.code, itemUrl, fromUid: req.user.uid };
  const { deletedCount } = await Kudos.deleteOne(key);
  if (!deletedCount) {
    const uids = room.members.map((m) => m.uid);
    const known = await GithubStats.exists({ uid: { $in: uids }, $or: [{ 'recentCommits.url': itemUrl }, { 'pullRequests.url': itemUrl }] });
    if (!known) return bad(res, 'That item isn’t in this room’s feed.', 404);
    await Kudos.create(key).catch((err) => { if (err.code !== 11000) throw err; });
  }
  res.json({ itemUrl, mine: !deletedCount, count: await Kudos.countDocuments({ roomCode: room.code, itemUrl }) });
});

/** POST /api/rooms/:code/challenges */
const createChallenge = withRoom(async (req, res, room) => {
  const { value, error } = svc.validateChallenge(req.body);
  if (error) return bad(res, error);
  if (await Challenge.countDocuments({ roomCode: room.code }) >= svc.LIMITS.challengesPerRoom) {
    return bad(res, `A room can have at most ${svc.LIMITS.challengesPerRoom} challenges.`);
  }
  const c = await Challenge.create({ ...value, roomCode: room.code, createdBy: req.user.uid });
  res.status(201).json({ id: c._id });
});

/** DELETE /api/rooms/:code/challenges/:id (creator or owner) */
const deleteChallenge = withRoom(async (req, res, room) => {
  const filter = { _id: String(req.params.id), roomCode: room.code };
  if (!isOwner(room, req.user.uid)) filter.createdBy = req.user.uid;
  if (!/^[a-f0-9]{24}$/.test(filter._id)) return bad(res, 'Challenge not found.', 404);
  const { deletedCount } = await Challenge.deleteOne(filter);
  if (!deletedCount) return bad(res, 'Challenge not found (or not yours to delete).', 404);
  res.json({ ok: true });
});

module.exports = {
  listRooms, createRoom, joinRoom, getRoom, heartbeat, leaveRoom, deleteRoom, removeMember,
  startTimer, stopTimer, setPlaylist, toggleKudos, createChallenge, deleteChallenge,
};

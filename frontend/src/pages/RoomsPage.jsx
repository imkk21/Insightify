import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { PageHeader, ErrorMsg, Loader } from '../components/UI';
import RoomList from '../components/rooms/RoomList';
import RoomView from '../components/rooms/RoomView';

const errOf = (e) => e.response?.data?.error || e.message;

/** /rooms → my rooms · /rooms?room=CODE → a room · /rooms?join=CODE → join, then open it. */
export default function RoomsPage() {
  const [params, setParams] = useSearchParams();
  const code = params.get('room');
  const joinCode = params.get('join');
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const joining = useRef(null);

  const open = useCallback((c) => setParams(c ? { room: c } : {}), [setParams]);

  const loadRooms = useCallback(async () => {
    try { setRooms((await api.get('/rooms')).data); }
    catch (e) { setError(errOf(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (!code && !joinCode) loadRooms(); }, [code, joinCode, loadRooms]);

  useEffect(() => {
    if (!joinCode || joining.current === joinCode) return; // StrictMode runs effects twice
    joining.current = joinCode;
    api.post('/rooms/join', { code: joinCode.toUpperCase() })
      .then(({ data }) => open(data.code))
      .catch((e) => { setError(`Couldn't join: ${errOf(e)}`); setParams({}, { replace: true }); });
  }, [joinCode, open, setParams]);

  const onLeft = useCallback((msg) => { setError(typeof msg === 'string' ? msg : ''); open(null); }, [open]);

  if (joinCode) return <Loader label="Joining room…" />;
  if (code) return <RoomView key={code} code={code} onBack={() => open(null)} onLeft={onLeft} />;

  return (
    <div>
      <PageHeader eyebrow="Social" title="Rooms & challenges"
        subtitle="Code alongside friends: live presence, shared focus sessions, kudos on each other's commits, and friendly challenges." />
      {error && <div className="mb-4"><ErrorMsg message={error} /></div>}
      <RoomList rooms={rooms} loading={loading} onOpen={open} />
    </div>
  );
}

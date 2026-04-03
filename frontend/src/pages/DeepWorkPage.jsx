import { useState, useEffect } from 'react';
import { PageHeader, Card, CardHeader, CardBody, DotLoader, EmptyState } from '../components/UI';
import { spotifyAPI } from '../services/api';
import { Music, ExternalLink, Headphones } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMusic } from '../context/MusicContext';

export default function DeepWorkPage() {
  const { 
    selectedPlaylist, 
    setSelectedPlaylist, 
    spotifyConnected, 
    playlists, 
    loadingPlaylists, 
    checkSpotifyStatus 
  } = useMusic();

  const handleConnectSpotify = async () => {
    try {
      const { data } = await spotifyAPI.getLoginUrl();
      window.location.href = data.url;
    } catch (err) { alert('Failed to initiate Spotify connection.'); }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect your Spotify account? This will stop neural synchronization.')) return;
    try {
      await spotifyAPI.disconnect();
      setSelectedPlaylist(null);
      await checkSpotifyStatus();
    } catch (err) { alert('Failed to disconnect Spotify.'); }
  };

  const handleResetPlayer = () => {
    localStorage.removeItem('music-pos');
    window.location.reload();
  };

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader title="Music" subtitle="Sync your neural rhythm with your Spotify library." />
      
      <div className="grid grid-cols-1 gap-8 items-start">
        
        {/* Spotify Integration Section */}
        <Card className="flex flex-col p-8 bg-card backdrop-blur-3xl rounded-[2rem] border-border shadow-xl">
          <CardHeader 
            title="Focus Architecture" 
            subtitle={spotifyConnected ? "Select a playlist to initialize your sonic environment" : "Connect your Spotify core"} 
            badge={
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-[10px] font-mono border ${spotifyConnected ? 'bg-teal2/10 text-teal2 border-teal2/20' : 'bg-rose/10 text-rose border-rose/20'}`}>
                  {spotifyConnected ? "V2 LINKED" : "OFFLINE"}
                </span>
                {spotifyConnected && (
                  <div className="flex gap-2">
                    <button 
                      onClick={handleResetPlayer}
                      className="p-1 px-3 text-[10px] bg-amber/5 text-amber border border-amber/20 rounded-full hover:bg-amber hover:text-black transition-all font-mono"
                    >
                      BRING PLAYER HOME
                    </button>
                    <button 
                      onClick={handleDisconnect}
                      className="p-1 px-3 text-[10px] bg-rose/5 text-rose border border-rose/20 rounded-full hover:bg-rose hover:text-white transition-all font-mono"
                    >
                      DISCONNECT
                    </button>
                  </div>
                )}
              </div>
            }
          />
          
          <CardBody className="flex-1 overflow-y-auto max-h-[700px] scrollbar-hide py-6">
            {!spotifyConnected ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-20 px-6">
                <div className="w-24 h-24 bg-[#1DB954]/10 rounded-[2.5rem] flex items-center justify-center mb-8 border border-[#1DB954]/20 animate-pulse">
                  <Headphones size={48} className="text-[#1DB954]" />
                </div>
                <h3 className="text-3xl font-bold text-foreground mb-4">Initialize Spotify</h3>
                <p className="text-ink3 text-base leading-relaxed mb-12 max-w-[400px]">
                  Authorize Spotify to bridge your high-fidelity playlists directly into your Insightify workspace.
                </p>
                <button 
                  onClick={handleConnectSpotify}
                  className="flex items-center gap-3 bg-[#1DB954] text-black px-12 py-5 rounded-[2rem] font-bold hover:scale-105 transition-all shadow-2xl shadow-[#1DB954]/20"
                >
                  <ExternalLink size={20} />
                  Connect Spotify Core
                </button>
              </div>
            ) : loadingPlaylists ? (
              <div className="flex items-center justify-center py-20"><DotLoader /></div>
            ) : playlists.length === 0 ? (
              <EmptyState emoji="🎵" title="No Playlists Found" subtitle="Create some playlists in your Spotify account first." />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Playlist Selection List */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {playlists.map((playlist) => (
                    <button
                      key={playlist.id}
                      onClick={() => setSelectedPlaylist(playlist)}
                      className={`group flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${selectedPlaylist?.id === playlist.id ? 'bg-amber/10 border-amber shadow-lg shadow-amber/10' : 'bg-card border-border hover:border-ink3/20'}`}
                    >
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
                        <img src={playlist.images?.[0]?.url || 'https://via.placeholder.com/150'} alt={playlist.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        {selectedPlaylist?.id === playlist.id && (
                          <div className="absolute inset-0 bg-amber/20 flex items-center justify-center backdrop-blur-[2px]">
                             <Music size={18} className="text-amber animate-pulse" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className={`text-sm font-bold truncate ${selectedPlaylist?.id === playlist.id ? 'text-amber' : 'text-foreground'}`}>{playlist.name}</div>
                        <div className="text-[10px] text-ink3 font-mono mt-1 uppercase tracking-widest">{playlist.tracks?.total} Tracks</div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Active Player Node */}
                <div className="lg:col-span-1">
                  <AnimatePresence mode="wait">
                    {selectedPlaylist ? (
                      <motion.div
                        key={selectedPlaylist.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="sticky top-8"
                      >
                        <Card className="overflow-hidden border-amber/40 shadow-2xl bg-[#1db954]/5">
                           <div className="p-6">
                              <div className="flex items-center gap-4 mb-6">
                                <img src={selectedPlaylist.images?.[0]?.url} className="w-20 h-20 rounded-2xl shadow-2xl" alt="" />
                                <div>
                                   <div className="text-[10px] font-mono text-[#1db954] uppercase tracking-[3px] mb-1">Active Environment</div>
                                   <div className="text-xl font-bold text-foreground leading-tight">{selectedPlaylist.name}</div>
                                </div>
                              </div>
                              <div className="rounded-3xl p-8 bg-black/5 border border-dashed border-border flex flex-col items-center justify-center text-center">
                                <Headphones size={32} className="text-teal2 mb-4 animate-pulse" />
                                <div className="text-xs font-mono text-ink3 uppercase tracking-widest">
                                  Routing Audio to Global Interface
                                </div>
                                <div className="mt-2 text-[10px] text-ink3/40">
                                  Check the player at the bottom of your screen
                                </div>
                              </div>
                           </div>
                        </Card>
                      </motion.div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-[2rem] opacity-30">
                        <Music size={48} className="mb-4" />
                        <div className="text-xs font-mono uppercase tracking-widest">Select to Initialize</div>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

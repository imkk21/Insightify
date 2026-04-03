import { createContext, useContext, useState, useEffect } from 'react';
import { spotifyAPI } from '../services/api';
import { useAuth } from './AuthContext';

const MusicContext = createContext();

export const MusicProvider = ({ children }) => {
  const { user } = useAuth();
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);

  const checkSpotifyStatus = async () => {
    try {
      const { data } = await spotifyAPI.getStatus();
      setSpotifyConnected(data.connected);
      if (data.connected && playlists.length === 0) fetchPlaylists();
    } catch (err) { console.error('Spotify status check failed:', err); }
  };

  const fetchPlaylists = async () => {
    setLoadingPlaylists(true);
    try {
      const { data } = await spotifyAPI.getPlaylists();
      setPlaylists(data);
    } catch (err) { console.error('Failed to fetch playlists:', err); }
    finally { setLoadingPlaylists(false); }
  };

  useEffect(() => {
    if (user) {
      checkSpotifyStatus();
      
      // Eager fetch if we just came back from auth
      if (window.location.search.includes('spotify=connected')) {
        fetchPlaylists();
      }
    }
  }, [user]);

  return (
    <MusicContext.Provider value={{
      selectedPlaylist,
      setSelectedPlaylist,
      spotifyConnected,
      setSpotifyConnected,
      playlists,
      loadingPlaylists,
      fetchPlaylists,
      checkSpotifyStatus
    }}>
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => useContext(MusicContext);

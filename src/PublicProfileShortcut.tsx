import { useEffect, useState } from "react";
import { Link2 } from "lucide-react";

type CurrentUser = {
  user: string;
};

const TOKEN_KEY = "gxst-token";

export function PublicProfileShortcut() {
  const [username, setUsername] = useState("");

  async function loadCurrentUser() {
    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (!token) {
      setUsername("");
      return;
    }

    try {
      const response = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        setUsername("");
        return;
      }
      const user = (await response.json()) as CurrentUser;
      setUsername(user.user);
    } catch {
      setUsername("");
    }
  }

  useEffect(() => {
    loadCurrentUser();
    const timer = window.setInterval(loadCurrentUser, 2500);
    return () => window.clearInterval(timer);
  }, []);

  if (!username) return null;

  return (
    <button className="public-shortcut-button" onClick={() => { window.location.hash = `/@${username}`; }}>
      <Link2 size={18} />
      Meu perfil
    </button>
  );
}

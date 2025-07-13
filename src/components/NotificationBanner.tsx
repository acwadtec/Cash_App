import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X } from 'lucide-react';

export function NotificationBanner() {
  const [banner, setBanner] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'moving' | 'flying' | 'hidden'>('idle');
  const [moveCount, setMoveCount] = useState(0);
  const bannerRef = useRef<HTMLDivElement>(null);
  const [bellPos, setBellPos] = useState<{x: number, y: number} | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: userData } = await supabase.auth.getUser();
      setUserId(userData?.user?.id || null);
    };
    getUser();
  }, []);

  const fetchBanner = async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('banner', true)
      .or(`user_uid.is.null,user_uid.eq.${userId}`)
      .lte('scheduled_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);
    if (!error && data && data.length > 0) {
      setBanner(data[0]);
      setDismissed(false);
      setPhase(data[0].type === 'ad' ? 'moving' : 'idle');
      setMoveCount(0);
    }
  };

  useEffect(() => {
    if (!userId) return;
    fetchBanner();
    const interval = setInterval(fetchBanner, 15000);
    return () => clearInterval(interval);
  }, [userId]);

  // Listen for bell position event
  useEffect(() => {
    const handler = (e: any) => {
      setBellPos(e.detail);
    };
    window.addEventListener('bell-pos', handler);
    return () => window.removeEventListener('bell-pos', handler);
  }, []);

  // Animation logic
  useEffect(() => {
    if (!banner || banner.type !== 'ad' || dismissed) return;
    if (phase === 'moving' && moveCount < 3) {
      const el = bannerRef.current;
      if (!el) return;
      el.style.transition = 'none';
      el.style.left = '-100%';
      el.style.top = '0px';
      el.style.opacity = '1';
      el.style.transform = 'scale(1)';
      setTimeout(() => {
        el.style.transition = 'left 5s linear'; // Slower left-to-right
        el.style.left = '100%';
      }, 50);
      const onTransitionEnd = () => {
        el.removeEventListener('transitionend', onTransitionEnd);
        setMoveCount(c => c + 1);
        if (moveCount + 1 < 3) {
          setTimeout(() => setPhase('moving'), 200);
        } else {
          setPhase('flying');
        }
      };
      el.addEventListener('transitionend', onTransitionEnd);
    } else if (phase === 'flying' && bellPos && bannerRef.current) {
      const el = bannerRef.current;
      const rect = el.getBoundingClientRect();
      el.style.transition = 'none';
      el.style.left = '0px';
      el.style.top = '0px';
      el.style.transform = 'scale(1)';
      setTimeout(() => {
        el.style.transition = 'left 1.2s cubic-bezier(0.4,1.4,0.6,1), top 1.2s cubic-bezier(0.4,1.4,0.6,1), transform 1.2s, opacity 1.2s'; // Slower fly-to-bell
        el.style.left = `${bellPos.x - rect.left}px`;
        el.style.top = `${bellPos.y - rect.top}px`;
        el.style.transform = 'scale(0.2)';
        el.style.opacity = '0';
      }, 50);
      const onTransitionEnd = () => {
        el.removeEventListener('transitionend', onTransitionEnd);
        setTimeout(() => setPhase('hidden'), 200);
      };
      el.addEventListener('transitionend', onTransitionEnd);
    }
  }, [phase, moveCount, bellPos, banner, dismissed]);

  if (!banner || dismissed || (banner.type === 'ad' && phase === 'hidden')) return null;

  // For non-ad banners, show as before
  if (banner.type !== 'ad') {
    return (
      <div className="fixed top-0 left-0 right-0 z-40 bg-primary text-primary-foreground flex items-center justify-between px-4 py-2 shadow-lg animate-fade-in">
        <div className="flex-1">
          <strong>{banner.title}</strong>
          <span className="ml-2">{banner.message}</span>
        </div>
        <button onClick={() => setDismissed(true)} className="ml-4">
          <X className="w-5 h-5" />
        </button>
      </div>
    );
  }

  // Ad banner: absolutely positioned for animation, improved design
  return (
    <div
      ref={bannerRef}
      style={{
        position: 'fixed',
        top: 20, // Lowered from very top for visibility
        left: '-100%',
        zIndex: 1000,
        minWidth: 340,
        maxWidth: '95vw',
        boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
        borderRadius: 12,
        background: 'linear-gradient(90deg, #22d3ee 0%, #2563eb 100%)',
        color: '#fff',
        fontWeight: 600,
        fontSize: 20,
        padding: '18px 32px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        cursor: 'pointer',
        border: '2px solid #fff',
        transition: 'box-shadow 0.2s',
      }}
      onMouseEnter={() => {
        if (bannerRef.current) bannerRef.current.style.transitionDuration = '0s';
      }}
      onMouseLeave={() => {
        if (bannerRef.current) bannerRef.current.style.transitionDuration = '';
      }}
    >
      {banner.image_url && (
        <img src={banner.image_url} alt="ad" style={{ maxHeight: 48, borderRadius: 8, marginRight: 12 }} />
      )}
      <span style={{ fontSize: 28, marginRight: 12 }}>📢</span>
      <div style={{ flex: 1, textAlign: 'center' }}>
        <strong style={{ fontSize: 22 }}>{banner.title}</strong>
        <span style={{ marginLeft: 12 }}>{banner.message}</span>
      </div>
      <button onClick={() => setDismissed(true)} style={{
        background: 'rgba(0,0,0,0.15)',
        border: 'none',
        borderRadius: '50%',
        width: 32,
        height: 32,
        color: '#fff',
        fontSize: 20,
        marginLeft: 16,
        cursor: 'pointer'
      }}>
        <X className="w-5 h-5" />
      </button>
    </div>
  );
} 
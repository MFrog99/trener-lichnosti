import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Profile, syncNow, useCloud } from '../lib/cloud';
import { cloudEnabled } from '../lib/config';
import { rankName } from '../lib/stats';
import { CHALLENGE_TYPES } from '../data/misc';
import { addDays, daysBetween, fmtDate, todayKey } from '../lib/util';
import { Empty, Modal, PageHead, Progress, Tabs, toast, useTitle } from '../components/ui';

interface Friendship { id: string; requester: string; addressee: string; status: 'pending' | 'accepted' }
interface Challenge { id: string; title: string; description: string; kind: string; days: number; start_date: string; code: string; created_by: string }
interface Member { challenge_id: string; user_id: string; checkins: string[] }

export default function Social() {
  useTitle('Друзья');
  const cloud = useCloud();
  const [tab, setTab] = useState<'friends' | 'rating' | 'challenges'>('friends');

  if (!cloudEnabled || !supabase) {
    return <div><PageHead title="Друзья и челленджи" /><Empty emoji="☁️" text="Социальные функции станут доступны после подключения облака (Supabase)." /></div>;
  }
  if (!cloud.session) {
    return (
      <div><PageHead title="Друзья и челленджи" />
        <Empty emoji="👥" text="Войдите в аккаунт, чтобы добавлять друзей, соревноваться в рейтинге и проходить челленджи вместе.">
          <Link to="/auth" className="btn">Войти или зарегистрироваться</Link>
        </Empty></div>
    );
  }
  return (
    <div>
      <PageHead title="Друзья и челленджи" sub="Вместе держать ритм легче" />
      <Tabs value={tab} onChange={setTab} items={[['friends', '👥 Друзья'], ['rating', '🏅 Рейтинг'], ['challenges', '⚔️ Челленджи']]} />
      {tab === 'friends' && <Friends me={cloud.session.user.id} myProfile={cloud.profile} />}
      {tab === 'rating' && <Rating me={cloud.session.user.id} />}
      {tab === 'challenges' && <Challenges me={cloud.session.user.id} />}
    </div>
  );
}

async function loadFriends(me: string) {
  const { data: fr } = await supabase!.from('friendships').select('*');
  const list = (fr || []) as Friendship[];
  const ids = [...new Set(list.flatMap((f) => [f.requester, f.addressee]).filter((x) => x !== me))];
  const { data: profs } = ids.length ? await supabase!.from('profiles').select('*').in('id', ids) : { data: [] };
  const byId: Record<string, Profile> = Object.fromEntries(((profs || []) as Profile[]).map((p) => [p.id, p]));
  return { list, byId };
}

function Friends({ me, myProfile }: { me: string; myProfile: Profile | null }) {
  const [list, setList] = useState<Friendship[]>([]);
  const [byId, setById] = useState<Record<string, Profile>>({});
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const r = await loadFriends(me);
    setList(r.list); setById(r.byId); setLoading(false);
  }, [me]);
  useEffect(() => { void reload(); }, [reload]);

  const add = async () => {
    if (!code.trim()) return;
    setBusy(true);
    const { data, error } = await supabase!.rpc('send_friend_request', { target: code.trim() });
    setBusy(false);
    if (error) { toast(error.message.includes('not found') ? 'Пользователь не найден' : error.message.includes('self') ? 'Это вы 🙂' : 'Не удалось отправить заявку'); return; }
    toast(data === 'accepted' ? 'Вы теперь друзья!' : data === 'exists' ? 'Заявка уже отправлена' : 'Заявка отправлена');
    setCode('');
    void reload();
  };
  const accept = async (f: Friendship) => {
    await supabase!.from('friendships').update({ status: 'accepted' }).eq('id', f.id);
    toast('Заявка принята'); void reload();
  };
  const remove = async (f: Friendship, msg: string) => {
    if (!confirm(msg)) return;
    await supabase!.from('friendships').delete().eq('id', f.id);
    void reload();
  };

  const friends = list.filter((f) => f.status === 'accepted');
  const incoming = list.filter((f) => f.status === 'pending' && f.addressee === me);
  const outgoing = list.filter((f) => f.status === 'pending' && f.requester === me);
  const other = (f: Friendship) => byId[f.requester === me ? f.addressee : f.requester];

  return (
    <div className="grid g2">
      <div className="col" style={{ gap: 14 }}>
        <div className="card">
          <h3>Ваш код друга</h3>
          <div className="row between">
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 3 }}>{myProfile?.friend_code ?? '…'}</div>
            <button className="btn secondary sm" onClick={() => { void navigator.clipboard?.writeText(myProfile?.friend_code ?? ''); toast('Код скопирован'); }}>Копировать</button>
          </div>
          <p className="muted small" style={{ margin: '6px 0 0' }}>Отправьте код другу или найдите друга по его коду или нику.</p>
        </div>
        <div className="card">
          <h3>Добавить друга</h3>
          <div className="row">
            <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Код или ник" onKeyDown={(e) => e.key === 'Enter' && add()} />
            <button className="btn" onClick={add} disabled={busy}>Добавить</button>
          </div>
        </div>
        {incoming.length > 0 && (
          <div className="card">
            <h3>Заявки в друзья</h3>
            {incoming.map((f) => (
              <div key={f.id} className="list-item">
                <div className="emoji-box">{other(f)?.avatar ?? '🙂'}</div>
                <div className="grow"><b>{other(f)?.nickname ?? '…'}</b></div>
                <button className="btn sm ok" onClick={() => accept(f)}>Принять</button>
                <button className="icon-btn" onClick={() => remove(f, 'Отклонить заявку?')}>✕</button>
              </div>
            ))}
          </div>
        )}
        {outgoing.length > 0 && (
          <div className="card">
            <h3 className="muted">Ожидают ответа</h3>
            {outgoing.map((f) => (
              <div key={f.id} className="list-item">
                <div className="emoji-box">{other(f)?.avatar ?? '🙂'}</div>
                <div className="grow">{other(f)?.nickname ?? '…'}</div>
                <button className="icon-btn" title="Отменить" onClick={() => remove(f, 'Отменить заявку?')}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card">
        <h3>Друзья ({friends.length})</h3>
        {loading ? <span className="spin" /> : friends.length === 0 ? <p className="muted">Пока никого. Добавьте друзей по коду!</p> : friends.map((f) => {
          const p = other(f);
          return (
            <div key={f.id} className="list-item">
              <div className="emoji-box">{p?.avatar ?? '🙂'}</div>
              <div className="grow"><b>{p?.nickname}</b>
                <div className="muted small">Ур. {p?.level} · {rankName(p?.level ?? 1)} · 🔥 {p?.streak ?? 0}</div></div>
              <span className="chip accent">⭐ {p?.xp ?? 0}</span>
              <button className="icon-btn" title="Удалить из друзей" onClick={() => remove(f, `Удалить ${p?.nickname} из друзей?`)}>🗑️</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Rating({ me }: { me: string }) {
  const [scope, setScope] = useState<'friends' | 'global'>('friends');
  const [rows, setRows] = useState<Profile[] | null>(null);
  useEffect(() => {
    setRows(null);
    (async () => {
      await syncNow();
      if (scope === 'global') {
        const { data } = await supabase!.from('profiles').select('*').order('xp', { ascending: false }).limit(50);
        setRows((data || []) as Profile[]);
      } else {
        const { list, byId } = await loadFriends(me);
        const ids = list.filter((f) => f.status === 'accepted').map((f) => (f.requester === me ? f.addressee : f.requester));
        const { data: mine } = await supabase!.from('profiles').select('*').eq('id', me).maybeSingle();
        const all = [...ids.map((id) => byId[id]).filter(Boolean), ...(mine ? [mine as Profile] : [])];
        setRows(all.sort((a, b) => b.xp - a.xp));
      }
    })();
  }, [scope, me]);
  return (
    <div className="card">
      <Tabs value={scope} onChange={setScope} items={[['friends', 'Среди друзей'], ['global', 'Все пользователи']]} />
      {!rows ? <span className="spin" /> : (
        <table className="table">
          <thead><tr><th>#</th><th>Пользователь</th><th>Уровень</th><th>Серия</th><th>Опыт</th></tr></thead>
          <tbody>{rows.map((p, i) => (
            <tr key={p.id} className={p.id === me ? 'me' : ''}>
              <td>{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</td>
              <td>{p.avatar} <b>{p.nickname}</b></td>
              <td>{p.level}</td><td>🔥 {p.streak}</td><td>⭐ {p.xp}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}

function Challenges({ me }: { me: string }) {
  const [list, setList] = useState<Challenge[] | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState('');

  const reload = useCallback(async () => {
    const { data: ch } = await supabase!.from('challenges').select('*').order('start_date', { ascending: false });
    const cs = (ch || []) as Challenge[];
    const { data: ms } = cs.length ? await supabase!.from('challenge_members').select('*').in('challenge_id', cs.map((c) => c.id)) : { data: [] };
    const mm = (ms || []) as Member[];
    const ids = [...new Set(mm.map((m) => m.user_id))];
    const { data: ps } = ids.length ? await supabase!.from('profiles').select('*').in('id', ids) : { data: [] };
    setProfiles(Object.fromEntries(((ps || []) as Profile[]).map((p) => [p.id, p])));
    setMembers(mm); setList(cs);
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const join = async () => {
    if (!code.trim()) return;
    const { error } = await supabase!.rpc('join_challenge', { join_code: code.trim() });
    if (error) { toast(error.message.includes('not found') ? 'Челлендж не найден' : 'Не удалось присоединиться'); return; }
    toast('Вы в челлендже!'); setCode(''); void reload();
  };
  const checkin = async (c: Challenge, m: Member) => {
    const t = todayKey();
    const has = m.checkins.includes(t);
    const next = has ? m.checkins.filter((x) => x !== t) : [...m.checkins, t];
    const { error } = await supabase!.from('challenge_members').update({ checkins: next }).eq('challenge_id', c.id).eq('user_id', me);
    if (!error) { toast(has ? 'Отметка снята' : 'Отмечено! 💪'); void reload(); }
  };
  const leave = async (c: Challenge) => {
    if (!confirm(c.created_by === me ? 'Удалить челлендж для всех участников?' : 'Выйти из челленджа?')) return;
    if (c.created_by === me) await supabase!.from('challenges').delete().eq('id', c.id);
    else await supabase!.from('challenge_members').delete().eq('challenge_id', c.id).eq('user_id', me);
    void reload();
  };

  return (
    <div>
      <div className="grid g2" style={{ marginBottom: 16 }}>
        <div className="card"><h3>Новый челлендж</h3><p className="muted small">Например: «30 дней тренировок» — пригласите друзей по коду.</p>
          <button className="btn" onClick={() => setCreating(true)}>＋ Создать</button></div>
        <div className="card"><h3>Присоединиться по коду</h3>
          <div className="row"><input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Код челленджа" />
            <button className="btn" onClick={join}>Войти</button></div></div>
      </div>
      {!list ? <span className="spin" /> : list.length === 0 ? <Empty emoji="⚔️" text="У вас пока нет челленджей" /> : list.map((c) => {
        const ms = members.filter((m) => m.challenge_id === c.id).sort((a, b) => b.checkins.length - a.checkins.length);
        const mine = ms.find((m) => m.user_id === me);
        const end = addDays(c.start_date, c.days - 1);
        const t = todayKey();
        const dayN = Math.min(c.days, Math.max(0, daysBetween(c.start_date, t) + 1));
        const status = t < c.start_date ? `Старт ${fmtDate(c.start_date)}` : t > end ? 'Завершён' : `День ${dayN} из ${c.days}`;
        const type = CHALLENGE_TYPES.find((x) => x.id === c.kind);
        const activeNow = t >= c.start_date && t <= end;
        return (
          <div key={c.id} className="card" style={{ marginBottom: 14 }}>
            <div className="row between wrap">
              <div><h3 style={{ margin: 0 }}>{type?.emoji} {c.title}</h3><div className="muted small">{status} · код: <b style={{ letterSpacing: 1 }}>{c.code}</b>
                <button className="icon-btn" style={{ fontSize: 13 }} onClick={() => { void navigator.clipboard?.writeText(c.code); toast('Код скопирован'); }}>📋</button></div></div>
              <div className="row">
                {mine && activeNow && <button className={'btn ' + (mine.checkins.includes(t) ? 'secondary' : 'ok')} onClick={() => checkin(c, mine)}>{mine.checkins.includes(t) ? '✓ Сегодня выполнено' : 'Отметить сегодня'}</button>}
                <button className="icon-btn" onClick={() => leave(c)}>{c.created_by === me ? '🗑️' : '🚪'}</button>
              </div>
            </div>
            {c.description && <p className="muted small" style={{ marginTop: 6 }}>{c.description}</p>}
            <div style={{ marginTop: 10 }}>
              {ms.map((m) => (
                <div key={m.user_id} className="row" style={{ marginBottom: 6 }}>
                  <div style={{ width: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profiles[m.user_id]?.avatar} {profiles[m.user_id]?.nickname ?? '…'}</div>
                  <div className="grow"><Progress value={m.checkins.length / c.days} /></div>
                  <span className="small muted" style={{ width: 54, textAlign: 'right' }}>{m.checkins.length}/{c.days}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {creating && <CreateChallenge onClose={() => setCreating(false)} onDone={() => { setCreating(false); void reload(); }} />}
    </div>
  );
}

function CreateChallenge({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [kind, setKind] = useState('workout');
  const [title, setTitle] = useState('30 дней тренировок');
  const [description, setDescription] = useState('');
  const [days, setDays] = useState(30);
  const [start, setStart] = useState(todayKey());
  const [busy, setBusy] = useState(false);
  const create = async () => {
    setBusy(true);
    const { error } = await supabase!.rpc('create_challenge', { p_title: title.trim(), p_description: description.trim(), p_kind: kind, p_days: days, p_start: start });
    setBusy(false);
    if (error) { toast('Не удалось создать челлендж'); return; }
    toast('Челлендж создан — поделитесь кодом с друзьями');
    onDone();
  };
  return (
    <Modal title="Новый челлендж" onClose={onClose}
      actions={<><button className="btn secondary" onClick={onClose}>Отмена</button><button className="btn" disabled={busy || !title.trim()} onClick={create}>Создать</button></>}>
      <label className="field"><span>Тип</span>
        <select value={kind} onChange={(e) => {
          setKind(e.target.value);
          const t = CHALLENGE_TYPES.find((x) => x.id === e.target.value);
          if (t && e.target.value !== 'custom') setTitle(`${days} дней: ${t.label.toLowerCase()}`);
        }}>{CHALLENGE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}</select></label>
      <label className="field"><span>Название</span><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} /></label>
      <label className="field"><span>Описание / правила</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ minHeight: 60 }} /></label>
      <div className="grid g2" style={{ gap: 10 }}>
        <label className="field"><span>Дней</span><input type="number" min={3} max={90} value={days} onChange={(e) => setDays(Math.max(3, Math.min(90, +e.target.value)))} /></label>
        <label className="field"><span>Старт</span><input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label>
      </div>
    </Modal>
  );
}

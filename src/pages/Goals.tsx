import { useState } from 'react';
import { Goal, GoalStep, items, store, useData } from '../lib/store';
import { GOAL_CATEGORIES } from '../data/misc';
import { XP } from '../lib/stats';
import { daysBetween, fmtDate, pl, todayKey, uid } from '../lib/util';
import { Empty, Modal, PageHead, Progress, Tabs, toast, useTitle } from '../components/ui';

export default function Goals() {
  useTitle('Цели');
  const d = useData();
  const [tab, setTab] = useState<'active' | 'done'>('active');
  const [editing, setEditing] = useState<Partial<Goal> | null>(null);
  const all = items(d, 'goals');
  const list = all.filter((g) => (tab === 'done' ? g.done : !g.done))
    .sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999') || b.createdAt - a.createdAt);

  const toggleStep = (g: Goal, s: GoalStep) => {
    const steps = g.steps.map((x) => (x.id === s.id ? { ...x, done: !x.done, doneAt: !x.done ? Date.now() : undefined } : x));
    store.put('goals', { ...g, steps });
    if (!s.done) toast(`+${XP.goalStep} XP`);
    if (!s.done && steps.every((x) => x.done) && !g.done) {
      setTimeout(() => { if (confirm('Все этапы выполнены! Отметить цель достигнутой?')) completeGoal({ ...g, steps }); }, 200);
    }
  };
  const completeGoal = (g: Goal) => {
    store.put('goals', { ...g, done: true, doneAt: Date.now() });
    toast(`🎯 Цель достигнута! +${XP.goal} XP`);
  };

  return (
    <div>
      <PageHead title="Цели и планы" sub="Большая цель — это много маленьких шагов"
        right={<button className="btn" onClick={() => setEditing({ category: 'growth', steps: [] })}>＋ Цель</button>} />
      <Tabs value={tab} onChange={setTab} items={[['active', `Активные (${all.filter((g) => !g.done).length})`], ['done', `Достигнутые (${all.filter((g) => g.done).length})`]]} />
      {list.length === 0 ? (
        <Empty emoji="🎯" text={tab === 'active' ? 'Поставьте цель и разбейте её на этапы. Хорошая цель конкретна, измерима и ограничена во времени.' : 'Здесь появятся достигнутые цели'}>
          {tab === 'active' && <button className="btn" onClick={() => setEditing({ category: 'growth', steps: [] })}>Поставить цель</button>}
        </Empty>
      ) : (
        <div className="grid g2">
          {list.map((g) => {
            const cat = GOAL_CATEGORIES.find((c) => c.id === g.category);
            const doneSteps = g.steps.filter((s) => s.done).length;
            const left = g.deadline ? daysBetween(todayKey(), g.deadline) : null;
            return (
              <div key={g.id} className="card">
                <div className="row between">
                  <span className="chip accent">{cat?.emoji} {cat?.label}</span>
                  <button className="icon-btn" onClick={() => setEditing(g)}>✏️</button>
                </div>
                <h3 style={{ marginTop: 8 }}>{g.done ? '✅ ' : ''}{g.title}</h3>
                {g.description && <p className="muted small">{g.description}</p>}
                {g.deadline && <p className="small" style={{ color: !g.done && left! < 0 ? 'var(--danger)' : 'var(--muted)' }}>
                  📅 {fmtDate(g.deadline)}{!g.done && left !== null ? (left >= 0 ? ` · осталось ${pl(left, ['день', 'дня', 'дней'])}` : ' · срок прошёл') : ''}</p>}
                {g.steps.length > 0 && <>
                  <Progress value={doneSteps / g.steps.length} />
                  <div className="muted small" style={{ margin: '4px 0 8px' }}>{doneSteps} из {g.steps.length} этапов</div>
                  {g.steps.map((s) => (
                    <label key={s.id} className="check" style={{ marginBottom: 6 }}>
                      <input type="checkbox" checked={s.done} onChange={() => toggleStep(g, s)} />
                      <span style={{ textDecoration: s.done ? 'line-through' : 'none', opacity: s.done ? 0.6 : 1 }}>{s.text}</span>
                    </label>
                  ))}
                </>}
                {!g.done && <button className="btn ok sm" style={{ marginTop: 8 }} onClick={() => completeGoal(g)}>Цель достигнута</button>}
                {g.done && <button className="btn ghost sm" style={{ marginTop: 8 }} onClick={() => store.put('goals', { ...g, done: false })}>Вернуть в активные</button>}
              </div>
            );
          })}
        </div>
      )}
      {editing && <GoalForm goal={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function GoalForm({ goal, onClose }: { goal: Partial<Goal>; onClose: () => void }) {
  const [title, setTitle] = useState(goal.title ?? '');
  const [description, setDescription] = useState(goal.description ?? '');
  const [category, setCategory] = useState(goal.category ?? 'growth');
  const [deadline, setDeadline] = useState(goal.deadline ?? '');
  const [steps, setSteps] = useState<GoalStep[]>(goal.steps ?? []);
  const [newStep, setNewStep] = useState('');
  const addStep = () => { if (newStep.trim()) { setSteps([...steps, { id: uid(), text: newStep.trim(), done: false }]); setNewStep(''); } };
  const save = () => {
    if (!title.trim()) return;
    store.put('goals', {
      id: goal.id ?? uid(), title: title.trim(), description: description.trim(), category, deadline: deadline || undefined,
      steps, done: goal.done ?? false, doneAt: goal.doneAt, createdAt: goal.createdAt ?? Date.now(),
    });
    onClose();
  };
  return (
    <Modal title={goal.id ? 'Цель' : 'Новая цель'} onClose={onClose}
      actions={<>
        {goal.id && <button className="btn danger" onClick={() => { if (confirm('Удалить цель?')) { store.remove('goals', goal.id!); onClose(); } }}>Удалить</button>}
        <button className="btn" onClick={save} disabled={!title.trim()}>Сохранить</button>
      </>}>
      <label className="field"><span>Цель</span><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: пробежать 5 км без остановки" autoFocus /></label>
      <label className="field"><span>Зачем мне это? (мотивация)</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ minHeight: 60 }} /></label>
      <div className="grid g2" style={{ gap: 10 }}>
        <label className="field"><span>Сфера</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>{GOAL_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}</select></label>
        <label className="field"><span>Срок</span><input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></label>
      </div>
      <div className="field"><span className="muted small" style={{ fontWeight: 600 }}>Этапы</span>
        {steps.map((s, i) => (
          <div key={s.id} className="row" style={{ marginBottom: 6 }}>
            <span className="grow">{i + 1}. {s.text}</span>
            <button className="icon-btn" onClick={() => setSteps(steps.filter((x) => x.id !== s.id))}>✕</button>
          </div>
        ))}
        <div className="row">
          <input type="text" value={newStep} onChange={(e) => setNewStep(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addStep()} placeholder="Новый этап…" />
          <button className="btn secondary" onClick={addStep}>＋</button>
        </div>
      </div>
    </Modal>
  );
}

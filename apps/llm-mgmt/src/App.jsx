import { useState, useEffect, useRef } from 'react'
import LlmModal, { maskedKey } from './LlmModal.jsx'


const CURRENT_USER = 'cedric.chencan@seamoney.com'
const REGIONS = ['ID', 'TH', 'PH', 'VN', 'MY', 'SG', 'TW', 'BR']
const PROVIDERS = ['OpenAI', 'Gemini', 'Claude', 'Compass']
const TEAMS = ['AimosTeam', 'DataSci', 'DataMart', 'RiskPolicy', 'Credit']

const EP_AIS = 'https://ais-apid1pg78.risk.shopee.io/services/808700/v1'
const EP_MY = 'https://ais-di-my.risk.shopee.io/services/808700/v1'
const EP_COMPASS = 'https://compass.llm.shopee.io/completions'

const SEED = [
  { name: 'Qwen2.5-VL-7B-SFT-V1-ID-Payslip', model: 'Monee/Qwen2.5-VL-7B-SFT-V1', provider: 'OpenAI', type: 'Chat', owners: ['zezhi.xiang@monee.com'], access: '', region: 'ID', endpoint: EP_AIS, desc: 'Qwen2.5-VL-7B-SFT-V1-ID-Payslip', created: '2026-09-08 17:22:00', updated: '2026-09-08 17:22:00', proxy: true, apikey: 'sk-qw25id001' },
  { name: 'Qwen3-VL-8B-Instruct-ID', model: 'Monee/Qwen3-VL-8B-Instruct', provider: 'OpenAI', type: 'Chat', owners: ['zezhi.xiang@monee.com', 'sankar.shyamal@seamoney.com'], access: '', region: 'ID', endpoint: EP_AIS, desc: '', created: '2026-09-08 10:27:29', updated: '2026-09-08 10:27:29', proxy: true, apikey: 'sk-qw3id002' },
  { name: 'Monee-Qwen3-VL-8B-SFT-V1-New', model: 'Monee/Qwen3-VL-8B-SFT-V1', provider: 'OpenAI', type: 'Chat', owners: ['zezhi.xiang@monee.com'], access: '', region: 'MY', endpoint: EP_MY, desc: '', created: '2026-09-07 17:29:13', updated: '2026-09-07 17:29:13', proxy: true, apikey: 'sk-my003' },
  { name: 'Qwen3-VL-8B-Instruct-MY-New', model: 'Monee/Qwen3-VL-8B-Instruct', provider: 'OpenAI', type: 'Chat', owners: ['zezhi.xiang@monee.com'], access: '', region: 'MY', endpoint: EP_MY, desc: '', created: '2026-09-07 15:24:05', updated: '2026-09-07 15:24:05', proxy: true, apikey: 'sk-my004' },
  { name: 'Qwen3.5-VL-9B-SFT-V2-PH-Payslip-Copy', model: 'Monee/Qwen35-VL-9B-SFT-V1', provider: 'OpenAI', type: 'Chat', owners: ['zezhi.xiang@monee.com', 'jiaxi.chen@monee.com'], access: '', region: 'PH', endpoint: EP_AIS, desc: '', created: '2026-09-04 15:46:42', updated: '2026-09-07 12:21:03', proxy: true, apikey: 'sk-ph005' },
  { name: 'Qwen3-VL-8B-Instruct-PH', model: 'Monee/Qwen3-VL-8B-Instruct', provider: 'OpenAI', type: 'Chat', owners: ['zezhi.xiang@monee.com', 'jiaxi.chen@monee.com'], access: '', region: 'PH', endpoint: EP_AIS, desc: '', created: '2026-09-04 14:47:35', updated: '2026-09-07 12:20:55', proxy: true, apikey: 'sk-ph006' },
  { name: 'Qwen3-VL-8B-SFT-V1-PH-BIR2316', model: 'Monee/Qwen3-VL-8B-SFT-V1', provider: 'OpenAI', type: 'Chat', owners: ['zezhi.xiang@monee.com', 'jiaxi.chen@monee.com'], access: '', region: 'PH', endpoint: EP_AIS, desc: '', created: '2026-09-03 18:27:26', updated: '2026-09-07 12:20:34', proxy: true, apikey: 'sk-ph007' },
  { name: 'Same-Person-AIS-Qwen3.6-35B-A3b-PH', model: 'qwen3.6-35b-a3b', provider: 'OpenAI', type: 'Chat', owners: ['jiaxi.chen@monee.com', 'siyan.chen@monee.com'], access: '', region: 'PH', endpoint: 'https://ais-di-all.risk.shopee.io/services/808700/v1', desc: '', created: '2026-09-02 18:46:53', updated: '2026-09-02 18:46:53', proxy: true, apikey: 'sk-ph008' },
  { name: 'Qwen3-VL-8B-Instruct-VN', model: 'Monee/Qwen3-VL-8B-Instruct', provider: 'OpenAI', type: 'Chat', owners: ['linhai.liu@monee.com', 'zhengyi.loh@seamoney.com'], access: '', region: 'VN', endpoint: EP_AIS, desc: 'Qwen3-VL-8B-Instruct-VN', created: '2026-08-28 16:05:19', updated: '2026-09-07 11:02:23', proxy: true, apikey: 'sk-vn009' },
  { name: 'Same-Person-Qwen3.6-35B-A3b-PH', model: 'qwen3.6-35b-a3b', provider: 'OpenAI', type: 'Chat', owners: ['jiaxi.chen@monee.com', 'siyan.chen@monee.com'], access: '', region: 'PH', endpoint: EP_COMPASS, desc: '', created: '2026-08-28 10:24:28', updated: '2026-08-28 10:24:28', proxy: true, apikey: 'sk-ph010' },
  { name: 'Embedding-Risk-Doc-SG', model: 'Monee/bge-large-sg', provider: 'Compass', type: 'Embedding', owners: [CURRENT_USER], access: 'DataSci', region: 'SG', endpoint: EP_COMPASS, desc: '风控文档向量化 Embedding 模型', created: '2026-08-20 14:10:00', updated: '2026-09-01 09:30:00', proxy: false, apikey: 'sk-sg011' },
  { name: 'Claude-Review-Assistant-MY', model: 'claude-sonnet-4', provider: 'Claude', type: 'Chat', owners: [CURRENT_USER], access: '', region: 'MY', endpoint: EP_COMPASS, desc: '材料审查辅助', created: '2026-08-15 11:00:00', updated: '2026-08-15 11:00:00', proxy: false, apikey: 'sk-my012' },
  { name: 'Gemini-Doc-Parse-ID', model: 'gemini-2.5-flash', provider: 'Gemini', type: 'Chat', owners: ['zhengyi.loh@seamoney.com'], access: 'AimosTeam', region: 'ID', endpoint: EP_COMPASS, desc: '', created: '2026-08-10 09:20:00', updated: '2026-08-28 15:00:00', proxy: true, apikey: 'sk-id013' },
  { name: 'Embed-TH-Kyc-Doc', model: 'Monee/bge-base-th', provider: 'Compass', type: 'Embedding', owners: ['linhai.liu@monee.com'], access: 'RiskPolicy', region: 'TH', endpoint: EP_COMPASS, desc: 'TH KYC 材料向量化', created: '2026-08-01 16:45:00', updated: '2026-08-01 16:45:00', proxy: false, apikey: 'sk-th014' },
]

function nowStr() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export default function App() {
  const [llms, setLlms] = useState(SEED.map((m) => ({ ...m, owners: [...m.owners] })))
  const [filters, setFilters] = useState({ name: '', model: '', type: '', region: '', provider: '', access: '' })
  const [expanded, setExpanded] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [modal, setModal] = useState(null)       // { mode, record }
  const [pop, setPop] = useState(null)           // { name, anchor }
  const [toasts, setToasts] = useState([])

  function toast(msg, type = 'info') {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, msg, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000)
  }

  const filtered = llms.filter((m) => {
    const f = filters
    return (
      (!f.name || m.name.toLowerCase().includes(f.name.trim().toLowerCase())) &&
      (!f.model || m.model.toLowerCase().includes(f.model.trim().toLowerCase())) &&
      (!f.type || m.type === f.type) &&
      (!f.region || m.region.toLowerCase().includes(f.region.trim().toLowerCase())) &&
      (!f.provider || m.provider === f.provider) &&
      (!f.access || (f.access === 'Private' ? !m.access : m.access === f.access))
    )
  }).sort((a, b) => b.updated.localeCompare(a.updated))

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  function applyFilters() {
    const f = {
      name: document.getElementById('f-name').value,
      model: document.getElementById('f-model').value,
      type: document.getElementById('f-type').value,
      region: document.getElementById('f-region').value,
      provider: document.getElementById('f-provider').value,
      access: document.getElementById('f-access').value,
    }
    setFilters(f)
    setPage(1)
  }

  function resetFilters() {
    setFilters({ name: '', model: '', type: '', region: '', provider: '', access: '' })
    setPage(1)
  }

  function handleSubmit(data) {
    if (modal.mode === 'edit') {
      setLlms((prev) => prev.map((m) => (m.name === modal.record.name
        ? { ...m, ...data, updated: nowStr() }
        : m)))
      toast('LLM updated')
    } else {
      setLlms((prev) => [
        { ...data, created: nowStr(), updated: nowStr() },
        ...prev,
      ])
      toast('LLM created')
    }
    setModal(null)
  }

  function handleCheck(form) {
    toast(`Checking ${form.endpoint} …`)
    setTimeout(() => toast('Endpoint reachable (mock)'), 600)
  }

  return (
    <>
      <div className="page">
        <div className="card filter-card">
          <div className="filter-grid">
            <div className="filter-item"><label>Name：</label><input id="f-name" type="text" placeholder="Please enter" defaultValue={filters.name} /></div>
            <div className="filter-item"><label>Model Name：</label><input id="f-model" type="text" placeholder="Please enter" defaultValue={filters.model} /></div>
            <div className="filter-item"><label>Model Type：</label>
              <select id="f-type" defaultValue={filters.type}><option value="">Please select</option><option>Chat</option><option>Embedding</option></select>
            </div>
            <div className="filter-item"><label>Region：</label><input id="f-region" type="text" placeholder="Please enter" defaultValue={filters.region} /></div>
            <div className="filter-item" data-extra hidden><label>Provider：</label>
              <select id="f-provider" defaultValue={filters.provider}><option value="">Please select</option>{PROVIDERS.map((p) => <option key={p}>{p}</option>)}</select>
            </div>
            <div className="filter-item" data-extra hidden><label>Team Access：</label>
              <select id="f-access" defaultValue={filters.access}><option value="">Please select</option><option>Private</option>{TEAMS.map((t) => <option key={t}>{t}</option>)}</select>
            </div>
            <div className="filter-actions">
              <button className="btn" onClick={resetFilters}>Reset</button>
              <button className="btn btn-primary" onClick={applyFilters}>Query</button>
              <button className="link-btn collapse-toggle" onClick={() => setExpanded(!expanded)}>{expanded ? 'Expand ∨' : 'Collapse ∧'}</button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="list-header">
            <span className="list-title">LLM Management</span>
            <button className="btn btn-primary" onClick={() => setModal({ mode: 'create', record: null })}>Create</button>
            <div className="toolbar-icons">
              <button className="icon-btn" title="Refresh" aria-label="Refresh" onClick={() => toast('Refreshed')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36" /><polyline points="21 3 21 9 15 9" /></svg>
              </button>
              <button className="icon-btn" title="LLM 资产说明" aria-label="LLM 资产说明"
                onClick={() => toast('LLM Mgmt 管理 AI Hub 的 LLM 资产：Provider / Endpoint / API Key 与 Team Access 可见范围')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="11" x2="12" y2="16" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
              </button>
              <button className="icon-btn" title="列设置（预留）" aria-label="列设置" onClick={() => toast('列设置：预留', 'error')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
              </button>
            </div>
          </div>

          <div className="table-scroll">
            <table className="llm-table">
              <thead>
                <tr>
                  <th>Name</th><th>Model Name</th><th>Provider</th><th>Model Type</th>
                  <th>Owner</th><th>Team Access</th><th>Region</th><th>Endpoint</th>
                  <th>Description</th><th>Create Time</th><th>Update Time</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr className="empty-row"><td colSpan={12}>No data</td></tr>
                ) : pageRows.map((m) => (
                  <tr key={m.name}>
                    <td className="mono">{m.name}</td>
                    <td className="mono">{m.model}</td>
                    <td>{m.provider}</td>
                    <td><span className={`chip-tag t-${m.type.toLowerCase()}`}>{m.type}</span></td>
                    <td className="multi-owner">{m.owners.map((o) => <div key={o}>{o}</div>)}</td>
                    <td>{m.access ? m.access : 'Private'}</td>
                    <td>{m.region}</td>
                    <td className="webhook-cell" title={m.endpoint}>{m.endpoint}</td>
                    <td>{m.desc ? esc(m.desc) : <span style={{ color: '#ccc' }}>-</span>}</td>
                    <td className="time">{m.created}</td>
                    <td className="time">{m.updated}</td>
                    <td>
                      <button className="link-btn edit" onClick={() => setModal({ mode: 'edit', record: m })}>Edit</button>
                      <button className="link-btn delete"
                        onClick={(e) => setPop({ name: m.name, anchor: e.currentTarget.getBoundingClientRect() })}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <span className="page-total">
              {filtered.length === 0 ? '0 items' : `${(safePage - 1) * pageSize + 1}-${Math.min(safePage * pageSize, filtered.length)} of ${filtered.length} items`}
            </span>
            <div className="page-buttons">
              <button className="page-btn" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} className={`page-btn${p === safePage ? ' current' : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="page-btn" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>›</button>
            </div>
            <select id="page-size" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}>
              <option value="10">10 / page</option>
              <option value="20">20 / page</option>
              <option value="50">50 / page</option>
            </select>
            <span className="goto-page">Go to <input id="goto-input" type="number" min={1} max={totalPages}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                const p = Number(e.target.value)
                if (p >= 1 && p <= totalPages) setPage(p)
                e.target.value = ''
              }} /> Page</span>
          </div>
        </div>
      </div>

      {pop && (
        <Popconfirm
          text={`确认删除 LLM「${pop.name}」？删除后依赖该模型的调用将失败。`}
          anchor={pop.anchor}
          onOk={() => {
            setLlms((prev) => prev.filter((x) => x.name !== pop.name))
            toast('LLM deleted')
            setPop(null)
          }}
          onCancel={() => setPop(null)}
        />
      )}

      {modal && (
        <LlmModal
          mode={modal.mode}
          record={modal.record}
          llms={llms}
          regions={REGIONS}
          providers={PROVIDERS}
          teams={TEAMS}
          currentUser={CURRENT_USER}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
          onCheck={handleCheck}
        />
      )}

      <div id="toast-container" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast${t.type === 'error' ? ' error' : ''}`}>{t.msg}</div>
        ))}
      </div>
    </>
  )
}

function Popconfirm({ text, anchor, onOk, onCancel }) {
  const [style] = useState(() => {
    const width = Math.min(280, window.innerWidth - 24)
    const left = Math.max(12, Math.min(anchor.left, window.innerWidth - width - 12))
    return {
      left,
      top: Math.min(anchor.bottom + 6, window.innerHeight - 110),
      width: width + 'px',
    }
  })
  const ref = useRef(null)
  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) onCancel()
    }
    function onKey(e) {
      if (e.key === 'Escape') onCancel()
    }
    const t = setTimeout(() => document.addEventListener('click', onDoc), 0)
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.removeEventListener('click', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [onCancel])
  return (
    <div ref={ref} className="popconfirm" style={style}>
      <div className="pop-text">{text}</div>
      <div className="pop-actions">
        <button className="pop-btn" onClick={onCancel}>Cancel</button>
        <button className="pop-btn danger" onClick={onOk}>OK</button>
      </div>
    </div>
  )
}


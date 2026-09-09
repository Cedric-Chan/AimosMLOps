import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter,
} from '@appica/ui-react/dialog'

/**
 * LLM 资产弹窗（左右布局：标签列在左、控件列在右；内容区超高一屏时滚动）
 * Appica Dialog + 受控表单；Submit 在必填未满足或重名时禁用，重名给内联提示。
 */
export default function LlmModal({ mode, record, llms, regions, providers, teams, currentUser, onClose, onSubmit, onCheck }) {
  const editing = mode === 'edit' && record
  const [form, setForm] = useState(() => ({
    name: editing ? record.name : '',
    region: editing ? record.region : '',
    provider: editing ? record.provider : '',
    type: editing ? record.type : '',
    model: editing ? record.model : '',
    apikey: editing ? maskedKey(record.apikey) : '',
    endpoint: editing ? record.endpoint : '',
    proxy: editing ? record.proxy : true,
    owner: editing ? record.owners[0] : currentUser,
    access: editing ? record.access : '',
    desc: editing ? record.desc : '',
  }))
  const [errors, setErrors] = useState({})
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  const nameDup = !!form.name && llms.some(
    (l) => l.name.toLowerCase() === form.name.toLowerCase() && l.name !== (editing ? record.name : null))
  const requiredFilled = form.name && form.region && form.provider && form.type &&
    form.model && form.apikey && form.endpoint && form.owner
  const valid = requiredFilled && !nameDup

  // 重名内联提示
  useEffect(() => {
    setErrors(form.name && nameDup ? { name: `LLM「${form.name}」已存在` } : {})
  }, [form.name, nameDup])

  function handleSubmit() {
    if (!valid) return
    const key = editing && form.apikey === maskedKey(record.apikey) ? record.apikey : form.apikey
    onSubmit({ ...form, apikey: key })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="llm-dialog" aria-label={`${mode === 'edit' ? 'Edit' : 'Create'} LLM Model`}>
        <DialogHeader className="modal-card-head" style={{ padding: 0, border: 'none' }}>
          <DialogTitle className="modal-card-title">
            {mode === 'edit' ? 'Edit LLM Model' : 'Create LLM Model'}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="modal-card-body" style={{ padding: 0 }}>
          <Row label="Name" required error={errors.name}>
            <input value={form.name} placeholder="Please enter"
              onChange={(e) => set('name')(e.target.value)} />
          </Row>
          <Row label="Region" required error={errors.region}>
            <Select value={form.region} onValueChange={set('region')}>
              <SelectTrigger aria-label="Region"><SelectValue placeholder="Please select" /></SelectTrigger>
              <SelectContent>
                {regions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </Row>
          <Row label="Provider" required error={errors.provider}>
            <Select value={form.provider} onValueChange={set('provider')}>
              <SelectTrigger aria-label="Provider"><SelectValue placeholder="Please select" /></SelectTrigger>
              <SelectContent>
                {providers.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </Row>
          <Row label="Model Type" required error={errors.type}>
            <Select value={form.type} onValueChange={set('type')}>
              <SelectTrigger aria-label="Model Type"><SelectValue placeholder="Please select" /></SelectTrigger>
              <SelectContent>
                {['Chat', 'Embedding'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </Row>
          <Row label="Model Name" required error={errors.model}>
            <input value={form.model} placeholder="e.g. Monee/Qwen3-VL-8B-Instruct"
              onChange={(e) => set('model')(e.target.value)} />
          </Row>
          <Row label="API Key" required error={errors.apikey}>
            <input value={form.apikey} placeholder="Please enter"
              onChange={(e) => set('apikey')(e.target.value)} />
          </Row>
          <Row label="Endpoint" required error={errors.endpoint}>
            <input value={form.endpoint} placeholder="https://..."
              onChange={(e) => set('endpoint')(e.target.value)} />
          </Row>
          <Row label="Need Proxy">
            <div className="proxy-row">
              <Switch checked={form.proxy} onCheckedChange={set('proxy')} aria-label="Need Proxy" />
            </div>
          </Row>
          <Row label="Owner" required error={errors.owner}>
            <OwnerChip value={form.owner} onChange={set('owner')} />
          </Row>
          <Row label="Team Access" help="Team Access 决定哪些 Biz Team 可以使用该模型">
            <Select value={form.access} onValueChange={set('access')}>
              <SelectTrigger aria-label="Team Access"><SelectValue placeholder="None (Private)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None (Private)</SelectItem>
                {teams.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="field-hint">None means this model is private and only available to its owners.</div>
          </Row>
          <Row label="Description">
            <textarea rows={3} value={form.desc} placeholder="Please enter"
              onChange={(e) => set('desc')(e.target.value)} />
          </Row>
        </DialogBody>
        <DialogFooter className="modal-card-foot" style={{ padding: 0, border: 'none' }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={!requiredFilled} onClick={() => onCheck(form)}>Check</button>
          <button className="btn btn-primary" disabled={!valid} onClick={handleSubmit}>Submit</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ---------- 弹窗内部小组件 ---------- */

function Row({ label, required, help, hint, error, children }) {
  return (
    <div className="form-row">
      <div className="form-label">
        {required && <i>*</i>}
        <span>{label}：</span>
        {help && <span className="help" title={help}>?</span>}
      </div>
      <div className="form-control">
        {children}
        {hint && <div className="field-hint">{hint}</div>}
        {error && <div className="form-err">{error}</div>}
      </div>
    </div>
  )
}

function OwnerChip({ value, onChange }) {
  const [draft, setDraft] = useState('')
  function commit() {
    const v = draft.trim().toLowerCase()
    if (!v) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return
    onChange(v)
    setDraft('')
  }
  return (
    <div className="owner-box">
      <span className="owner-chips">
        {value && (
          <span className="owner-chip">
            {value}
            <button type="button" className="chip-x" aria-label="移除 Owner" onClick={() => onChange('')}>×</button>
          </span>
        )}
      </span>
      <input value={draft} placeholder="type email, Enter to add"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { commit(); e.preventDefault() } }}
        onBlur={commit} />
    </div>
  )
}

/* ---------- helpers ---------- */

export function maskedKey(key) {
  return '****' + key.slice(-1)
}

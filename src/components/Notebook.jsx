// components/Notebook.jsx
import { useState, useRef, useEffect } from 'react'
import {
  Plus,
  X,
  Pencil as PenIcon,
  Eraser,
  StickyNote,
  PenLine,
  Trash2,
  Bold,
  Italic,
  GripHorizontal,
  ChevronDown,
  Check,
} from 'lucide-react'

const PRESET_COLORS = ['#1a3d7c', '#000000', '#c0392b', '#1e7e34', '#8e44ad', '#e67e22']

const FONT_OPTIONS = [
  { label: 'Handwriting', value: "'Caveat', cursive" },
  { label: 'Clean', value: "system-ui, sans-serif" },
  { label: 'Typewriter', value: "'Courier New', monospace" },
  { label: 'Elegant', value: "Georgia, serif" },
]

function createTextBox(offset = 0) {
  return {
    id: Date.now() + Math.random(),
    html: '',
    x: 20 + (offset % 5) * 24,
    y: 20 + (offset % 5) * 24,
    width: 260,
    height: 140,
    font: FONT_OPTIONS[0].value,
    color: '#000000',
    fontSize: 22,
  }
}

function createPage(title = 'Page 1') {
  return {
    id: Date.now() + Math.random(),
    title,
    textBoxes: [],
    drawing: null,
  }
}

// Converts old-format pages/boxes into the current shape
function migratePage(p) {
  if (!p.textBoxes) {
    const textBoxes = []
    if (p.note && p.note.trim()) {
      textBoxes.push({
        id: Date.now() + Math.random(),
        html: p.note,
        x: 20,
        y: 20,
        width: 280,
        height: 160,
        font: p.noteFont || FONT_OPTIONS[0].value,
        color: p.noteColor || '#000000',
        fontSize: 22,
      })
    }
    return { id: p.id, title: p.title, textBoxes, drawing: p.drawing || null }
  }
  return {
    ...p,
    textBoxes: p.textBoxes.map((b) => ({
      ...b,
      html: b.html !== undefined ? b.html : (b.text || ''),
    })),
  }
}

export default function Notebook({ storageKey }) {
  const pagesKey = `${storageKey}-pages`

  const [pages, setPages] = useState(() => {
    try {
      const saved = localStorage.getItem(pagesKey)
      if (saved) {
        const parsed = JSON.parse(saved).map(migratePage)
        if (parsed.length > 0) return parsed
      }
    } catch (e) {}
    return [createPage()]
  })

  const [activePageId, setActivePageId] = useState(() => pages[0].id)
  const [activeLayer, setActiveLayer] = useState('notes')
  const [tool, setTool] = useState('pen')
  const [drawColor, setDrawColor] = useState(PRESET_COLORS[0])
  const [brushSize, setBrushSize] = useState(3)
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [selectedBoxId, setSelectedBoxId] = useState(null)
  const [fontMenuOpen, setFontMenuOpen] = useState(false)

  const canvasRef = useRef(null)
  const isDrawing = useRef(false)
  const lastPoint = useRef(null)
  const drawnPageId = useRef(null)

  useEffect(() => {
    localStorage.setItem(pagesKey, JSON.stringify(pages))
  }, [pages, pagesKey])

  const activePage = pages.find((p) => p.id === activePageId) || pages[0]
  const selectedBox = activePage?.textBoxes.find((b) => b.id === selectedBoxId) || null

  // Close font menu whenever the selected box changes (e.g. switching pages/boxes)
  useEffect(() => {
    setFontMenuOpen(false)
  }, [selectedBoxId])

  // Close font menu on any click outside of it
  useEffect(() => {
    if (!fontMenuOpen) return
    const close = () => setFontMenuOpen(false)
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [fontMenuOpen])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !activePage) return
    if (drawnPageId.current === activePage.id) return
    drawnPageId.current = activePage.id

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (activePage.drawing) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0)
      img.src = activePage.drawing
    }
  }, [activePage])

  const updatePage = (pageId, fields) => {
    setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, ...fields } : p)))
  }

  const addPage = () => {
    const newPage = createPage(`Page ${pages.length + 1}`)
    setPages((prev) => [...prev, newPage])
    setActivePageId(newPage.id)
    setSelectedBoxId(null)
  }

  const deletePage = (id) => {
    if (pages.length === 1) return
    const remaining = pages.filter((p) => p.id !== id)
    setPages(remaining)
    if (activePageId === id) {
      drawnPageId.current = null
      setActivePageId(remaining[0].id)
      setSelectedBoxId(null)
    }
  }

  const startRename = (page) => {
    setRenamingId(page.id)
    setRenameValue(page.title)
  }

  const confirmRename = () => {
    if (renameValue.trim()) {
      setPages((prev) =>
        prev.map((p) => (p.id === renamingId ? { ...p, title: renameValue.trim() } : p))
      )
    }
    setRenamingId(null)
  }

  // ---- Text box helpers ----
  const addTextBox = () => {
    const box = createTextBox(activePage.textBoxes.length)
    updatePage(activePage.id, { textBoxes: [...activePage.textBoxes, box] })
    setSelectedBoxId(box.id)
  }

  const updateTextBox = (boxId, fields) => {
    setPages((prev) =>
      prev.map((p) =>
        p.id !== activePageId
          ? p
          : {
              ...p,
              textBoxes: p.textBoxes.map((b) => (b.id === boxId ? { ...b, ...fields } : b)),
            }
      )
    )
  }

  const deleteTextBox = (boxId) => {
    updatePage(activePage.id, { textBoxes: activePage.textBoxes.filter((b) => b.id !== boxId) })
    if (selectedBoxId === boxId) setSelectedBoxId(null)
  }

  const startDragBox = (e, box) => {
    e.stopPropagation()
    e.preventDefault()
    setSelectedBoxId(box.id)

    const point = (ev) => (ev.touches ? ev.touches[0] : ev)
    const start = point(e)
    const startX = start.clientX
    const startY = start.clientY
    const originX = box.x
    const originY = box.y

    const onMove = (ev) => {
      const p = point(ev)
      const dx = p.clientX - startX
      const dy = p.clientY - startY
      updateTextBox(box.id, { x: originX + dx, y: originY + dy })
    }
    const onEnd = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onEnd)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onEnd)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)
  }

  // ---- Drawing helpers ----
  const getPos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const startDraw = (e) => {
    isDrawing.current = true
    lastPoint.current = getPos(e)
  }

  const draw = (e) => {
    if (!isDrawing.current) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e)

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.globalAlpha = 1
      ctx.lineWidth = brushSize * 4
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = tool === 'marker' ? 0.4 : 1
      ctx.lineWidth = tool === 'marker' ? brushSize * 2.5 : brushSize
    }

    ctx.strokeStyle = drawColor
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.beginPath()
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()

    lastPoint.current = pos
  }

  const endDraw = () => {
    if (!isDrawing.current) return
    isDrawing.current = false
    updatePage(activePage.id, { drawing: canvasRef.current.toDataURL() })
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    updatePage(activePage.id, { drawing: null })
  }

  if (!activePage) return null

  return (
    <div className="notebook-wrap">
      <div className="notebook-toolbar-top">
        <div className="notebook-pages">
          {pages.map((page) => (
            <div
              key={page.id}
              className={`notebook-page-tab${page.id === activePageId ? ' notebook-page-tab--active' : ''}`}
              onClick={() => {
                setActivePageId(page.id)
                setSelectedBoxId(null)
              }}
              onDoubleClick={() => startRename(page)}
            >
              {renamingId === page.id ? (
                <input
                  className="notebook-page-rename"
                  value={renameValue}
                  autoFocus
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={confirmRename}
                  onKeyDown={(e) => e.key === 'Enter' && confirmRename()}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <span>{page.title}</span>
                  <button
                    className="notebook-page-rename-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      startRename(page)
                    }}
                    aria-label="Rename page"
                  >
                    <PenIcon size={11} />
                  </button>
                </>
              )}

              {pages.length > 1 && renamingId !== page.id && (
                <button
                  className="notebook-page-close"
                  onClick={(e) => {
                    e.stopPropagation()
                    deletePage(page.id)
                  }}
                  aria-label="Delete page"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
          <button className="notebook-page-add" onClick={addPage} aria-label="Add page">
            <Plus size={14} />
          </button>
        </div>

        <div className="notebook-tabs">
          <button
            className={`notebook-tab${activeLayer === 'notes' ? ' notebook-tab--active' : ''}`}
            onClick={() => setActiveLayer('notes')}
          >
            <StickyNote size={15} />
            Type
          </button>
          <button
            className={`notebook-tab${activeLayer === 'draw' ? ' notebook-tab--active' : ''}`}
            onClick={() => setActiveLayer('draw')}
          >
            <PenLine size={15} />
            Draw
          </button>
        </div>
      </div>

      {activeLayer === 'notes' && (
        <div className="notebook-draw__toolbar">
          <button className="notebook-add-text-btn" onClick={addTextBox} title="Add text box">
            <Plus size={15} />
            <span>Add Text</span>
          </button>

          {selectedBox && (
            <>
              <div
                className="notebook-font-picker"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="notebook-font-picker__trigger"
                  onClick={() => setFontMenuOpen((v) => !v)}
                >
                  <span style={{ fontFamily: selectedBox.font }}>
                    {FONT_OPTIONS.find((f) => f.value === selectedBox.font)?.label || 'Font'}
                  </span>
                  <ChevronDown size={14} />
                </button>

                {fontMenuOpen && (
                  <div className="notebook-font-picker__menu">
                    {FONT_OPTIONS.map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        className={`notebook-font-picker__option${selectedBox.font === f.value ? ' notebook-font-picker__option--active' : ''}`}
                        onClick={() => {
                          updateTextBox(selectedBox.id, { font: f.value })
                          setFontMenuOpen(false)
                        }}
                      >
                        <span className="notebook-font-picker__sample" style={{ fontFamily: f.value }}>
                          Aa
                        </span>
                        <span className="notebook-font-picker__label" style={{ fontFamily: f.value }}>
                          {f.label}
                        </span>
                        {selectedBox.font === f.value && (
                          <Check size={14} className="notebook-font-picker__check" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="notebook-swatches">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`notebook-swatch${selectedBox.color === c ? ' notebook-swatch--active' : ''}`}
                    style={{ background: c }}
                    onClick={() => updateTextBox(selectedBox.id, { color: c })}
                    aria-label={`Text color ${c}`}
                  />
                ))}
                <input
                  type="color"
                  value={selectedBox.color}
                  onChange={(e) => updateTextBox(selectedBox.id, { color: e.target.value })}
                  className="notebook-color-picker"
                  title="Custom text color"
                />
              </div>

              <input
                type="range"
                min="12"
                max="48"
                value={selectedBox.fontSize}
                onChange={(e) => updateTextBox(selectedBox.id, { fontSize: Number(e.target.value) })}
                className="notebook-brush-size"
                title="Font size"
              />

              <button
                className="notebook-tool"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => document.execCommand('bold')}
                title="Bold the highlighted text"
              >
                <Bold size={15} />
              </button>
              <button
                className="notebook-tool"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => document.execCommand('italic')}
                title="Italicize the highlighted text"
              >
                <Italic size={15} />
              </button>

              <button
                className="icon-button icon-button--ghost"
                onClick={() => deleteTextBox(selectedBox.id)}
                aria-label="Delete text box"
                title="Delete text box"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      )}

      {activeLayer === 'draw' && (
        <div className="notebook-draw__toolbar">
          <div className="notebook-tools">
            <button
              className={`notebook-tool${tool === 'pen' ? ' notebook-tool--active' : ''}`}
              onClick={() => setTool('pen')}
              title="Pen"
            >
              <PenIcon size={15} />
            </button>
            <button
              className={`notebook-tool${tool === 'marker' ? ' notebook-tool--active' : ''}`}
              onClick={() => setTool('marker')}
              title="Marker"
            >
              <PenLine size={15} />
            </button>
            <button
              className={`notebook-tool${tool === 'eraser' ? ' notebook-tool--active' : ''}`}
              onClick={() => setTool('eraser')}
              title="Eraser"
            >
              <Eraser size={15} />
            </button>
          </div>

          <div className="notebook-swatches">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                className={`notebook-swatch${drawColor === c ? ' notebook-swatch--active' : ''}`}
                style={{ background: c }}
                onClick={() => setDrawColor(c)}
                aria-label={`Color ${c}`}
              />
            ))}
            <input
              type="color"
              value={drawColor}
              onChange={(e) => setDrawColor(e.target.value)}
              className="notebook-color-picker"
              title="Custom color"
            />
          </div>

          <input
            type="range"
            min="1"
            max="12"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="notebook-brush-size"
            title="Brush size"
          />

          <button className="icon-button icon-button--ghost" onClick={clearCanvas} aria-label="Clear drawing" title="Clear drawing">
            <Trash2 size={16} />
          </button>
          <button className="icon-button icon-button--ghost" onClick={() => setActiveLayer('notes')} aria-label="Exit drawing" title="Exit drawing">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Single combined sheet — text boxes + drawing layer both always visible together */}
      <div className="notebook-paper notebook-page-fade" key={activePage.id}>
        <div className="notebook-paper__holes">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="notebook-hole" />
          ))}
        </div>

        <div
          className="notebook-paper__sheet"
          onClick={() => setSelectedBoxId(null)}
        >
          {activePage.textBoxes.map((box) => (
            <div
              key={box.id}
              className={`notebook-textbox${selectedBoxId === box.id ? ' notebook-textbox--selected' : ''}`}
              style={{
                left: box.x,
                top: box.y,
                width: box.width,
                height: box.height,
                pointerEvents: activeLayer === 'notes' ? 'auto' : 'none',
              }}
              onClick={(e) => {
                e.stopPropagation()
                setSelectedBoxId(box.id)
              }}
            >
              {selectedBoxId === box.id && (
                <div
                  className="notebook-textbox__handle"
                  onMouseDown={(e) => startDragBox(e, box)}
                  onTouchStart={(e) => startDragBox(e, box)}
                >
                  <GripHorizontal size={13} />
                  <button
                    className="notebook-textbox__delete"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteTextBox(box.id)
                    }}
                    aria-label="Delete text box"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              <div
                contentEditable
                suppressContentEditableWarning
                ref={(el) => {
                  if (el && el.innerHTML === '' && box.html) {
                    el.innerHTML = box.html
                  }
                }}
                className="notebook-textbox__area"
                data-placeholder="Type here..."
                style={{
                  fontFamily: box.font,
                  color: box.color,
                  fontSize: box.fontSize,
                  height: selectedBoxId === box.id ? 'calc(100% - 24px)' : '100%',
                }}
                onInput={(e) => updateTextBox(box.id, { html: e.currentTarget.innerHTML })}
                onFocus={() => setSelectedBoxId(box.id)}
              />
            </div>
          ))}

          <canvas
            ref={canvasRef}
            width={900}
            height={560}
            className="notebook-canvas"
            style={{ pointerEvents: activeLayer === 'draw' ? 'auto' : 'none' }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
        </div>
      </div>
    </div>
  )
}


import { useState, useEffect } from 'react'

const API_BASE = 'http://localhost:5176/api'

function App() {
  const [flowId, setFlowId] = useState('')
  const [input, setInput] = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then(r => r.json())
      .then(() => setConnected(true))
      .catch(() => setConnected(false))
  }, [])

  const runFlow = async () => {
    const id = flowId.trim()
    if (!id) return
    setRunning(true)
    setResult(null)
    try {
      const r = await fetch(`${API_BASE}/flows/${id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input || undefined })
      })
      const data = await r.json()
      setResult(data)
    } catch (e) {
      setResult({ success: false, error: e.message })
    } finally {
      setRunning(false)
    }
  }

  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2">正在连接后端服务...</h1>
          <p className="text-gray-400 text-sm">请确保服务已启动 (端口 5176)</p>
          <button onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 text-sm">
            重试
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Flow Runner</h1>
          <span className="text-xs text-green-400">已连接</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-4">
        {/* 流程图 ID */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">流程图 ID</label>
          <input
            value={flowId}
            onChange={e => setFlowId(e.target.value)}
            placeholder="例如: graph-1769233065043"
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            onKeyDown={e => e.key === 'Enter' && !running && runFlow()}
          />
        </div>

        {/* 输入数据 */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">输入数据（可选）</label>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="输入初始数据..."
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            rows={3}
          />
        </div>

        {/* 执行按钮 */}
        <button
          onClick={runFlow}
          disabled={running || !flowId.trim()}
          className="w-full py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 rounded font-medium text-sm transition"
        >
          {running ? '执行中...' : '执行'}
        </button>

        {/* 执行结果 */}
        {result && (
          <div className={`p-4 rounded-lg ${result.success ? 'bg-green-900/30 border border-green-800' : 'bg-red-900/30 border border-red-800'}`}>
            <h3 className={`font-semibold mb-2 text-sm ${result.success ? 'text-green-400' : 'text-red-400'}`}>
              {result.success ? '执行成功' : '执行失败'}
            </h3>
            <pre className="text-sm whitespace-pre-wrap overflow-x-auto bg-gray-900 p-3 rounded max-h-[60vh] overflow-y-auto">
              {result.output || result.error || '无输出'}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default App

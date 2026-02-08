/**
 * Flow Runner 后端服务器
 * 通过调用 najie-flow CLI 提供 API
 */

import express from 'express'
import cors from 'cors'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 5176

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, 'ui', 'dist')))

// najie-flow CLI 路径
function getCLIPath() {
  // 尝试在系统中查找 najie-flow CLI
  // 如果已全局安装，可以使用 'najie-flow'
  // 如果是本地开发，需要指定正确的路径
  const cliPath = process.env.NAJIE_FLOW_CLI || 'najie-flow'
  return cliPath
}

function runCLI(args, options = {}) {
  return new Promise((resolve, reject) => {
    const nodeCmd = process.execPath
    const cliPath = getCLIPath()
    const fullArgs = [cliPath, ...args]
    
    console.log(`[CLI] node ${fullArgs.join(' ')}`)
    
    const child = spawn(nodeCmd, fullArgs, {
      cwd: options.cwd || __dirname,
      env: { ...process.env, FORCE_COLOR: '0' },
      shell: false
    })
    
    let stdout = '', stderr = ''
    child.stdout.on('data', d => stdout += d.toString())
    child.stderr.on('data', d => stderr += d.toString())
    
    child.on('close', code => {
      resolve(code === 0 
        ? { success: true, output: stdout, stderr }
        : { success: false, error: stderr || stdout, code })
    })
    child.on('error', reject)
    
    setTimeout(() => { child.kill(); reject(new Error('超时')) }, options.timeout || 60000)
  })
}

function parseFlowList(output) {
  const flows = []
  const lines = output.split('\n')
  let currentGroup = null
  
  for (const line of lines) {
    if (line.match(/\s+(.+)/)) { currentGroup = line.match(/\s+(.+)/)[1].trim(); continue }
    if (line.includes(' 未分组')) { currentGroup = null; continue }
    const m = line.match(/^\s+(\S+)\s{2,}(.+)$/)
    if (m && !line.includes('ℹ') && !line.includes('找到')) {
      flows.push({ id: m[1].trim(), name: m[2].trim(), group: currentGroup })
    }
  }
  return flows
}

function parseFlowShow(output) {
  const info = { nodes: [] }
  const lines = output.split('\n')
  
  for (const line of lines) {
    if (line.includes('ID:')) info.id = line.split('ID:')[1]?.trim()
    if (line.includes('名称:')) info.name = line.split('名称:')[1]?.trim()
    if (line.includes('节点数:')) info.nodeCount = parseInt(line.split('节点数:')[1]) || 0
    if (line.includes('边数:')) info.edgeCount = parseInt(line.split('边数:')[1]) || 0
  }
  
  let inNodes = false
  for (const line of lines) {
    if (line.includes('节点列表')) { inNodes = true; continue }
    if (inNodes && line.includes('-')) {
      const m = line.match(/-\s+(\S+)\s+\((\S+)\):\s+(.+)/)
      if (m) info.nodes.push({ id: m[1], type: m[2], label: m[3] })
    }
  }
  return info
}

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

app.get('/api/flows', async (req, res) => {
  try {
    const result = await runCLI(['list'])
    res.json(result.success 
      ? { success: true, data: parseFlowList(result.output) }
      : { success: false, error: result.error })
  } catch (e) { res.status(500).json({ success: false, error: e.message }) }
})

app.get('/api/flows/:id', async (req, res) => {
  try {
    const result = await runCLI(['show', req.params.id, '-e'])
    res.json(result.success
      ? { success: true, data: parseFlowShow(result.output) }
      : { success: false, error: result.error })
  } catch (e) { res.status(500).json({ success: false, error: e.message }) }
})

app.post('/api/flows/:id/run', async (req, res) => {
  try {
    const { input, maxIterations } = req.body
    const args = ['run', req.params.id]
    if (input) args.push('-i', input)
    if (maxIterations) args.push('-m', String(maxIterations))
    
    const result = await runCLI(args, { timeout: 120000 })
    res.json({ success: result.success, output: result.output, error: result.error })
  } catch (e) { res.status(500).json({ success: false, error: e.message }) }
})

app.use((req, res) => res.sendFile(path.join(__dirname, 'ui', 'dist', 'index.html')))

app.listen(PORT, () => console.log(`Flow Runner 服务已启动: http://localhost:${PORT}`))

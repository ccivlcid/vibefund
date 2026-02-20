// Supabase REST API를 통해 마이그레이션 SQL을 실행하는 스크립트
// 사용: node supabase/apply_migration.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = 'https://oxyjutbyfejuhewugyly.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eWp1dGJ5ZmVqdWhld3VneWx5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTUzMzAyMCwiZXhwIjoyMDg3MTA5MDIwfQ.awzva4WZS2d5GL4B7bDlNrBeRVWB_TX2N30sqkHZC7w'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// DDL 문을 세미콜론으로 분리해 순차 실행
const sqlFile = join(__dirname, 'migrations', '001_initial_schema.sql')
const sql = readFileSync(sqlFile, 'utf-8')

// 주석 제거 후 세미콜론 기준으로 분리
const statements = sql
  .replace(/--[^\n]*/g, '')          // 한줄 주석 제거
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0)

console.log(`총 ${statements.length}개 SQL 구문 실행 예정\n`)

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i]
  const preview = stmt.slice(0, 60).replace(/\n/g, ' ')
  process.stdout.write(`[${i + 1}/${statements.length}] ${preview}... `)

  const { error } = await supabase.rpc('exec_ddl', { sql: stmt + ';' }).catch(() => ({ error: { message: 'rpc not available' } }))

  if (error) {
    // rpc가 없으면 직접 REST /rpc 호출로 시도
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_ddl`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql: stmt + ';' }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.log(`❌ 실패: ${body.slice(0, 100)}`)
      continue
    }
  }
  console.log('✓')
}

console.log('\n마이그레이션 완료')

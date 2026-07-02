const STORAGE_PREFIX = 'netshield_'

const getStore = (key) => {
  try {
    const data = localStorage.getItem(STORAGE_PREFIX + key)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

const setStore = (key, data) => {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data))
  } catch {
    // storage full or unavailable
  }
}

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const entityCRUD = (entityName) => ({
  list: async (orderBy = '-created_date', limit = 50) => {
    const items = getStore(entityName)
    const sorted = [...items].sort((a, b) => {
      const field = orderBy.startsWith('-') ? orderBy.slice(1) : orderBy
      const dir = orderBy.startsWith('-') ? -1 : 1
      const va = a[field] || ''
      const vb = b[field] || ''
      return va < vb ? -dir : va > vb ? dir : 0
    })
    return sorted.slice(0, limit)
  },
  create: async (data) => {
    const items = getStore(entityName)
    const now = new Date().toISOString()
    const item = { id: generateId(), ...data, created_date: now, updated_date: now }
    items.unshift(item)
    setStore(entityName, items)
    return item
  },
  update: async (id, data) => {
    const items = getStore(entityName)
    const idx = items.findIndex(i => i.id === id)
    if (idx === -1) throw new Error(`${entityName} not found: ${id}`)
    items[idx] = { ...items[idx], ...data, updated_date: new Date().toISOString() }
    setStore(entityName, items)
    return items[idx]
  },
  delete: async (id) => {
    const items = getStore(entityName)
    setStore(entityName, items.filter(i => i.id !== id))
  }
})

const seededData = (key, data) => {
  const existing = localStorage.getItem(STORAGE_PREFIX + key)
  if (!existing || JSON.parse(existing).length === 0) {
    setStore(key, data)
  }
}

const seedSampleData = () => {
  const now = Date.now()
  const day = 86400000

  seededData('Alert', [
    { id: generateId(), title: 'SQL Injection Attempt on Web Server', severity: 'critical', status: 'new', source_ip: '185.220.101.45', destination_ip: '10.0.1.10', protocol: 'HTTP', category: 'web_attack', detection_engine: 'waf', risk_score: 92, country: 'RU', created_date: new Date(now - 180000).toISOString() },
    { id: generateId(), title: 'Port Scan Detected — 22/tcp', severity: 'high', status: 'investigating', source_ip: '103.235.46.88', destination_ip: '10.0.1.5', protocol: 'TCP', category: 'reconnaissance', detection_engine: 'suricata', risk_score: 78, country: 'CN', created_date: new Date(now - 900000).toISOString() },
    { id: generateId(), title: 'DNS Tunneling Anomaly', severity: 'medium', status: 'new', source_ip: '10.0.1.15', destination_ip: '8.8.8.8', protocol: 'DNS', category: 'anomaly', detection_engine: 'ai_engine', risk_score: 65, country: 'US', created_date: new Date(now - 3600000).toISOString() },
    { id: generateId(), title: 'Outbound Data Transfer to Unknown IP', severity: 'high', status: 'new', source_ip: '10.0.1.20', destination_ip: '45.33.32.156', protocol: 'HTTPS', category: 'data_exfiltration', detection_engine: 'ai_engine', risk_score: 85, country: 'US', created_date: new Date(now - 7200000).toISOString() },
    { id: generateId(), title: 'Brute Force SSH Attack', severity: 'critical', status: 'escalated', source_ip: '91.121.87.34', destination_ip: '10.0.1.5', protocol: 'SSH', category: 'brute_force', detection_engine: 'suricata', risk_score: 95, country: 'FR', created_date: new Date(now - 14400000).toISOString() },
  ])

  seededData('NetworkSession', [
    { id: generateId(), source_ip: '10.0.1.10', destination_ip: '203.0.113.50', source_port: 443, destination_port: 34512, protocol: 'HTTPS', bytes_in: 1450000, bytes_out: 230000, packets_in: 1200, packets_out: 450, duration: 340, status: 'active', action: 'allow', risk_score: 15, created_date: new Date(now - 60000).toISOString() },
    { id: generateId(), source_ip: '10.0.1.15', destination_ip: '8.8.8.8', source_port: 53, destination_port: 41023, protocol: 'DNS', bytes_in: 3400, bytes_out: 1200, packets_in: 24, packets_out: 12, duration: 2, status: 'active', action: 'allow', risk_score: 40, created_date: new Date(now - 120000).toISOString() },
    { id: generateId(), source_ip: '185.220.101.45', destination_ip: '10.0.1.10', source_port: 51923, destination_port: 80, protocol: 'HTTP', bytes_in: 12000, bytes_out: 89000, packets_in: 45, packets_out: 120, duration: 15, status: 'suspicious', action: 'block', risk_score: 92, created_date: new Date(now - 300000).toISOString() },
    { id: generateId(), source_ip: '10.0.1.5', destination_ip: '192.168.1.20', source_port: 22, destination_port: 49152, protocol: 'SSH', bytes_in: 45000, bytes_out: 32000, packets_in: 340, packets_out: 280, duration: 1200, status: 'active', action: 'allow', risk_score: 35, created_date: new Date(now - 600000).toISOString() },
    { id: generateId(), source_ip: '10.0.1.20', destination_ip: '45.33.32.156', source_port: 443, destination_port: 52001, protocol: 'HTTPS', bytes_in: 8900000, bytes_out: 120000, packets_in: 5600, packets_out: 890, duration: 280, status: 'suspicious', action: 'monitor', risk_score: 78, created_date: new Date(now - 1800000).toISOString() },
    { id: generateId(), source_ip: '192.168.1.10', destination_ip: '10.0.1.30', source_port: 445, destination_port: 49153, protocol: 'SMB', bytes_in: 230000, bytes_out: 560000, packets_in: 450, packets_out: 890, duration: 90, status: 'active', action: 'allow', risk_score: 65, created_date: new Date(now - 3600000).toISOString() },
    { id: generateId(), source_ip: '10.0.1.50', destination_ip: 'smtp.gmail.com', source_port: 587, destination_port: 43012, protocol: 'SMTP', bytes_in: 4500, bytes_out: 23000, packets_in: 34, packets_out: 78, duration: 12, status: 'closed', action: 'allow', risk_score: 50, created_date: new Date(now - 7200000).toISOString() },
    { id: generateId(), source_ip: '103.235.46.88', destination_ip: '10.0.1.5', source_port: 22, destination_port: 57892, protocol: 'TCP', bytes_in: 3400, bytes_out: 1200, packets_in: 8, packets_out: 6, duration: 45, status: 'blocked', action: 'block', risk_score: 78, created_date: new Date(now - 900000).toISOString() },
  ])

  seededData('Asset', [
    { id: generateId(), hostname: 'web-prod-01', ip_address: '10.0.1.10', mac_address: '00:1a:2b:3c:4d:01', asset_type: 'server', os: 'Ubuntu 22.04', department: 'Engineering', criticality: 'critical', status: 'active', risk_score: 78, last_seen: new Date().toISOString(), open_ports: '80,443,22', services: 'nginx, sshd', vulnerabilities: 3, created_date: new Date(now - 30 * day).toISOString() },
    { id: generateId(), hostname: 'db-prod-01', ip_address: '10.0.1.20', mac_address: '00:1a:2b:3c:4d:02', asset_type: 'server', os: 'Ubuntu 22.04', department: 'Engineering', criticality: 'critical', status: 'active', risk_score: 45, last_seen: new Date().toISOString(), open_ports: '3306,5432,22', services: 'mysql, postgresql, sshd', vulnerabilities: 1, created_date: new Date(now - 30 * day).toISOString() },
    { id: generateId(), hostname: 'fw-edge-01', ip_address: '10.0.0.1', mac_address: '00:1a:2b:3c:4d:03', asset_type: 'firewall', os: 'pfSense 2.7', department: 'Infrastructure', criticality: 'critical', status: 'active', risk_score: 15, last_seen: new Date().toISOString(), services: 'firewall, vpn', vulnerabilities: 1, created_date: new Date(now - 60 * day).toISOString() },
    { id: generateId(), hostname: 'ws-marketing-12', ip_address: '192.168.1.10', mac_address: 'aa:bb:cc:dd:ee:01', asset_type: 'workstation', os: 'Windows 11', department: 'Marketing', criticality: 'medium', status: 'active', risk_score: 33, last_seen: new Date(Date.now() - 3600000).toISOString(), services: '', vulnerabilities: 5, created_date: new Date(now - 15 * day).toISOString() },
    { id: generateId(), hostname: 'ws-eng-05', ip_address: '192.168.1.11', mac_address: 'aa:bb:cc:dd:ee:02', asset_type: 'workstation', os: 'macOS 14', department: 'Engineering', criticality: 'high', status: 'active', risk_score: 88, last_seen: new Date(Date.now() - 600000).toISOString(), services: '', vulnerabilities: 8, created_date: new Date(now - 20 * day).toISOString() },
    { id: generateId(), hostname: 'iot-cam-lobby', ip_address: '192.168.2.5', mac_address: '11:22:33:44:55:01', asset_type: 'iot', os: 'Embedded Linux', department: 'Facilities', criticality: 'low', status: 'active', risk_score: 91, last_seen: new Date(Date.now() - 300000).toISOString(), services: '', vulnerabilities: 12, created_date: new Date(now - 90 * day).toISOString() },
  ])

  seededData('Incident', [
    { id: generateId(), title: 'Ransomware Outbreak — Engineering Dept', severity: 'critical', status: 'containment', category: 'ransomware', assigned_to: 'soc-lead', risk_score: 98, created_date: new Date(now - 4 * day).toISOString() },
    { id: generateId(), title: 'Phishing Campaign — Q2', severity: 'high', status: 'investigating', category: 'phishing', assigned_to: 'analyst-1', risk_score: 76, created_date: new Date(now - 2 * day).toISOString() },
    { id: generateId(), title: 'Unauthorized VPN Access', severity: 'medium', status: 'open', category: 'unauthorized_access', assigned_to: '', risk_score: 62, created_date: new Date(now - 12 * 3600000).toISOString() },
  ])

  seededData('ThreatIntel', [
    { id: generateId(), ioc_type: 'ip', ioc_value: '185.220.101.45', threat_type: 'c2', confidence: 92, severity: 'critical', source: 'AlienVault OTX', status: 'active', description: 'Known C2 server — Emotet infrastructure', first_seen: new Date(now - 14 * day).toISOString(), created_date: new Date(now - 14 * day).toISOString() },
    { id: generateId(), ioc_type: 'domain', ioc_value: 'evil-malware.xyz', threat_type: 'malware', confidence: 85, severity: 'high', source: 'VirusTotal', status: 'active', description: 'Malware distribution domain', first_seen: new Date(now - 7 * day).toISOString(), created_date: new Date(now - 7 * day).toISOString() },
    { id: generateId(), ioc_type: 'hash_sha256', ioc_value: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b', threat_type: 'ransomware', confidence: 98, severity: 'critical', source: 'Mandiant', status: 'active', description: 'LockBit 3.0 ransomware hash', first_seen: new Date(now - 3 * day).toISOString(), created_date: new Date(now - 3 * day).toISOString() },
    { id: generateId(), ioc_type: 'email', ioc_value: 'phish@scam-company.ru', threat_type: 'phishing', confidence: 75, severity: 'medium', source: 'AbuseIPDB', status: 'active', description: 'Phishing email sender', first_seen: new Date(now - 1 * day).toISOString(), created_date: new Date(now - 1 * day).toISOString() },
  ])

  seededData('AuditLog', [
    { id: generateId(), action: 'User Login', user_name: 'admin', user_role: 'admin', resource_type: 'session', details: 'Successful login from 10.0.0.5', ip_address: '10.0.0.5', result: 'success', created_date: new Date(now - 60000).toISOString() },
    { id: generateId(), action: 'Alert Created', user_name: 'admin', user_role: 'admin', resource_type: 'alert', details: 'Created alert: SQL Injection Attempt', ip_address: '10.0.0.5', result: 'success', created_date: new Date(now - 180000).toISOString() },
    { id: generateId(), action: 'Alert Status Update', user_name: 'analyst-1', user_role: 'analyst', resource_type: 'alert', details: 'Changed alert status to investigating', ip_address: '10.0.0.10', result: 'success', created_date: new Date(now - 900000).toISOString() },
    { id: generateId(), action: 'Failed Login', user_name: 'unknown', user_role: '', resource_type: 'session', details: 'Failed login attempt from 91.121.87.34', ip_address: '91.121.87.34', result: 'failure', created_date: new Date(now - 3600000).toISOString() },
    { id: generateId(), action: 'Asset Deleted', user_name: 'admin', user_role: 'admin', resource_type: 'asset', details: 'Decommissioned asset: old-web-01', ip_address: '10.0.0.5', result: 'success', created_date: new Date(now - 7200000).toISOString() },
  ])
}

seedSampleData()

const getAuthUser = () => {
  try {
    const stored = localStorage.getItem(STORAGE_PREFIX + 'current_user')
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

const setAuthUser = (user) => {
  if (user) {
    localStorage.setItem(STORAGE_PREFIX + 'current_user', JSON.stringify(user))
  } else {
    localStorage.removeItem(STORAGE_PREFIX + 'current_user')
  }
}

const getToken = () => localStorage.getItem(STORAGE_PREFIX + 'token')

const setToken = (token) => {
  if (token) {
    localStorage.setItem(STORAGE_PREFIX + 'token', token)
  } else {
    localStorage.removeItem(STORAGE_PREFIX + 'token')
  }
}

export const api = {
  auth: {
    me: async () => {
      const user = getAuthUser()
      if (user) return user
      const token = getToken()
      if (token) {
        const defaultUser = { id: 'user-1', email: 'admin@netshield.io', full_name: 'Admin', role: 'admin' }
        setAuthUser(defaultUser)
        return defaultUser
      }
      throw { status: 401, message: 'Not authenticated' }
    },
    loginViaEmailPassword: async (email, _password) => {
      const user = { id: 'user-1', email, full_name: email.split('@')[0], role: 'admin' }
      setToken('netshield-token-' + Date.now())
      setAuthUser(user)
      return user
    },
    loginWithProvider: async (_provider, redirect) => {
      const user = { id: 'user-1', email: 'admin@netshield.io', full_name: 'Admin', role: 'admin' }
      setToken('netshield-token-' + Date.now())
      setAuthUser(user)
      window.location.href = redirect || '/'
    },
    logout: (redirect) => {
      setToken(null)
      setAuthUser(null)
      if (redirect) {
        window.location.href = redirect
      }
    },
    redirectToLogin: (redirect) => {
      window.location.href = '/login?redirect=' + encodeURIComponent(redirect || '/')
    },
    register: async (data) => {
      const user = { id: 'user-1', ...data, full_name: data.email.split('@')[0], role: 'user' }
      setToken('netshield-token-' + Date.now())
      setAuthUser(user)
      return user
    },
    verifyOtp: async (data) => {
      return { access_token: getToken() || 'netshield-token-' + Date.now() }
    },
    resendOtp: async () => {
      return { success: true }
    },
    setToken: (token) => {
      setToken(token)
    },
    resetPasswordRequest: async () => {
      return { success: true }
    },
    resetPassword: async () => {
      return { success: true }
    },
  },
  entities: {
    Alert: entityCRUD('Alert'),
    Asset: entityCRUD('Asset'),
    Incident: entityCRUD('Incident'),
    NetworkSession: entityCRUD('NetworkSession'),
    ThreatIntel: entityCRUD('ThreatIntel'),
    AuditLog: entityCRUD('AuditLog'),
  },
  integrations: {
    Core: {
      InvokeLLM: async ({ prompt }) => {
        await new Promise(r => setTimeout(r, 1500))
        const responses = {
          executive: `# Executive Security Summary\n\n## Overall Risk Posture: **MODERATE**\n\n| Metric | Value |\n|--------|-------|\n| Total Alerts | 5 |\n| Critical/High | 3 |\n| Active Assets | 6 |\n| Incidents | 3 |\n\n## Key Findings\n- **Critical**: Brute force SSH attack detected from 91.121.87.34 (France)\n- **High**: SQL injection attempt blocked by WAF\n- **Medium**: DNS tunneling anomaly detected on 10.0.1.15\n\n## Recommendations\n1. Enforce geo-blocking for SSH access\n2. Review WAF rules for SQL injection patterns\n3. Conduct security awareness training`,
          threat: `# Threat Analysis Report\n\n## Threat Landscape\n| Threat | Source | Severity | Status |\n|--------|--------|----------|--------|\n| Emotet C2 | 185.220.101.45 | Critical | Active |\n| LockBit 3.0 | a1b2c3... | Critical | Active |\n\n## MITRE ATT&CK Mapping\n- **TA0001** (Initial Access): Phishing campaign\n- **TA0011** (C2): Emotet infrastructure\n- **TA0040** (Impact): Ransomware outbreak\n\n## Recommended Actions\n1. Block all IOCs at firewall\n2. Deploy EDR detection rules\n3. Isolate affected hosts`,
          compliance: `# Compliance Report\n\n## ISO 27001\n| Control | Status |\n|---------|--------|\n| A.9 Access Control | Partial |\n| A.12 Operations Security | Compliant |\n| A.16 Incident Management | Compliant |\n\n## PCI-DSS\n- Requirement 1: Firewall config — **Pass**\n- Requirement 10: Logging — **Partial**\n\n## NIST CSF\n- Identify: **On Track**\n- Protect: **Needs Improvement**\n- Detect: **On Track**\n- Respond: **On Track**\n- Recover: **Needs Improvement**`,
          incident: `# Incident Report\n\n## Incident Summary\n**Ransomware Outbreak — Engineering Department**\n- Status: Containment\n- Severity: Critical\n\n## Timeline\n1. **Detection**: Suspicious SMB traffic detected\n2. **Analysis**: LockBit 3.0 identified\n3. **Containment**: Affected systems isolated\n4. **Eradication**: In progress\n\n## Root Cause\nPhishing email with malicious attachment\n\n## Lessons Learned\n1. Improve email filtering\n2. Deploy endpoint detection\n3. Regular backup validation`,
        }
        const matched = Object.keys(responses).find(k => prompt.toLowerCase().includes(k))
        return responses[matched] || `# Analysis Report\n\n## Summary\nBased on the current security data, the network has **5 active alerts** and **6 monitored assets**.\n\n## Key Metrics\n- Critical alerts: 2\n- High-risk assets: 2\n- Active sessions: 4\n\n## Recommendation\nContinue monitoring and ensure all critical patches are applied.`
      },
    },
  },
}

export const createAxiosClient = (_config) => {
  return {
    get: async (url) => {
      if (url.includes('public-settings')) {
        return { id: 'app-1', public_settings: {} }
      }
      throw { status: 404, message: 'Not found' }
    },
    post: async () => ({ success: true }),
  }
}

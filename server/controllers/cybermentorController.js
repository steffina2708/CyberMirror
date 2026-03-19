// ── CyberMentor — Intelligent rule-based cybersecurity assistant ─
// If GROQ_API_KEY or OPENAI_API_KEY is set in .env the real LLM is used.
// Otherwise falls back to a rich deterministic knowledge base.

const KB = [
  {
    keys: ['phishing', 'phish', 'fake email', 'suspicious email', 'spear'],
    title: 'Phishing Attacks',
    answer: `Phishing is a social engineering attack where attackers impersonate trusted entities to steal credentials or install malware.
**Key red flags:**
• Mismatched or misspelled sender domains (e.g. paypa1.com)
• Urgent or threatening language ("Your account will be closed!")
• Hovering over links reveals a different destination URL
• Requests for passwords, credit card numbers, or PINs
• Generic greetings ("Dear Customer") instead of your name

**Defense:** Always verify the sender's domain, enable MFA, and report suspicious emails to your IT team.`,
  },
  {
    keys: ['ransomware', 'encrypt files', 'ransom'],
    title: 'Ransomware',
    answer: `Ransomware is malware that encrypts your files and demands payment for the decryption key.
**How it spreads:** Phishing emails, malicious downloads, unpatched vulnerabilities, RDP brute force.
**Critical defenses:**
• Maintain offline/air-gapped backups (3-2-1 rule)
• Patch operating systems and applications promptly
• Disable RDP when not needed; use MFA for remote access
• Never pay the ransom — it funds criminals and doesn't guarantee file recovery
• Isolate infected devices immediately by disconnecting from the network`,
  },
  {
    keys: ['malware', 'virus', 'trojan', 'worm', 'spyware', 'rootkit'],
    title: 'Malware',
    answer: `Malware is any software designed to damage, disrupt or gain unauthorized access to systems.
**Common types:**
• **Virus** — attaches to files and spreads when executed
• **Worm** — self-replicates across networks without user interaction
• **Trojan** — disguised as legitimate software
• **Spyware** — silently captures keystrokes and data
• **Rootkit** — hides deep in the OS to maintain persistent access

**Defense:** Keep antivirus updated, avoid untrusted downloads, use application allow-listing, and monitor endpoint behaviour.`,
  },
  {
    keys: ['password', 'strong password', 'passphrase', 'credentials', 'brute force'],
    title: 'Password Security',
    answer: `Weak passwords are one of the top causes of account compromise.
**Strong password rules:**
• Minimum 16 characters
• Mix of uppercase, lowercase, numbers, symbols
• Never reuse passwords across sites
• Use a **passphrase**: "Tr0ub4dor&3" beats "password123" in every attack

**Best practices:**
• Use a reputable password manager (Bitwarden, 1Password)
• Enable two-factor authentication (2FA/MFA) on every account
• Check breached credentials at haveibeenpwned.com`,
  },
  {
    keys: ['mfa', '2fa', 'two factor', 'multi factor', 'authenticator'],
    title: 'Multi-Factor Authentication',
    answer: `MFA adds a second verification step beyond just a password, stopping 99.9% of automated attacks.
**Types (from weakest to strongest):**
1. SMS codes — convenient but vulnerable to SIM-swapping
2. Time-based OTP apps (Google Authenticator, Authy) — better
3. Hardware security keys (YubiKey, FIDO2) — strongest

**Recommendation:** Enable MFA everywhere, especially email, banking, and cloud services. Prefer authenticator apps over SMS.`,
  },
  {
    keys: ['ddos', 'denial of service', 'flood', 'traffic spike'],
    title: 'DDoS Attacks',
    answer: `A Distributed Denial of Service (DDoS) attack overwhelms a server with millions of requests from thousands of compromised machines (a botnet).
**Types:**
• Volumetric — raw traffic flood (UDP/ICMP)
• Protocol — SYN flood, exhausting connection tables
• Application layer (Layer 7) — HTTP request floods

**Defense:**
• CDN with DDoS scrubbing (Cloudflare, AWS Shield)
• Rate limiting and IP reputation filtering
• Anycast network diffusion absorbs large floods
• Auto-scaling infrastructure during attacks`,
  },
  {
    keys: ['firewall', 'packet filter', 'network rules', 'iptables'],
    title: 'Firewalls',
    answer: `A firewall controls incoming and outgoing network traffic based on security rules.
**Types:**
• **Packet filtering** — inspects IP/port headers (basic)
• **Stateful inspection** — tracks active connections
• **Next-Gen Firewall (NGFW)** — deep packet inspection, application awareness, IPS
• **WAF** (Web Application Firewall) — protects against SQLi, XSS, CSRF

**Key principle:** Default-deny. Only allow explicitly required traffic and log everything else.`,
  },
  {
    keys: ['social engineering', 'pretexting', 'vishing', 'smishing'],
    title: 'Social Engineering',
    answer: `Social engineering exploits human psychology rather than technical vulnerabilities.
**Common techniques:**
• **Pretexting** — fabricating a scenario to gain trust
• **Vishing** — voice phishing over phone calls
• **Smishing** — phishing via SMS
• **Baiting** — leaving infected USB drives in parking lots
• **Tailgating** — physically following someone into a secure area

**Defense:** Security awareness training, verify identities through official channels, never share credentials verbally.`,
  },
  {
    keys: ['zero day', '0day', 'cve', 'vulnerability', 'exploit', 'patch'],
    title: 'Zero-Day Vulnerabilities',
    answer: `A zero-day is a software vulnerability unknown to the vendor — attackers exploit it before a patch exists.
**Lifecycle:**
1. Discovery (by attacker or researcher)
2. Exploitation in the wild
3. Vendor notified / discovers
4. Patch developed and released
5. Users patch — vulnerability closes

**Defense:**
• Patch management — apply updates within 24-72 hours of release
• Defence-in-depth — assume breaches happen, limit blast radius
• Endpoint Detection & Response (EDR) tools detect suspicious behaviour
• Network segmentation reduces lateral movement`,
  },
  {
    keys: ['encryption', 'tls', 'ssl', 'certificate', 'https', 'end to end'],
    title: 'Encryption',
    answer: `Encryption transforms readable data into ciphertext that only authorised parties can decode.
**Key concepts:**
• **Symmetric encryption** (AES-256) — same key to encrypt/decrypt; fast
• **Asymmetric encryption** (RSA, ECC) — public/private key pair; used for key exchange
• **TLS 1.3** — secures data in transit (HTTPS)
• **End-to-end encryption (E2EE)** — only sender/recipient can read (Signal, WhatsApp)

**Practical tips:** Always use HTTPS, encrypt sensitive data at rest, and rotate encryption keys regularly.`,
  },
  {
    keys: ['sql injection', 'sqli', 'database attack', 'input validation'],
    title: 'SQL Injection',
    answer: `SQL injection (SQLi) inserts malicious SQL code into input fields to manipulate the database.
**Classic example:**
\`' OR '1'='1\` in a login form bypasses authentication.

**Impact:** Data theft, account takeover, data deletion, server compromise.

**Defence:**
• **Parameterised queries / prepared statements** — the #1 fix
• ORM frameworks that abstract SQL (Sequelize, Prisma)
• Input validation and allow-listing
• Least-privilege database accounts
• Web Application Firewall (WAF) for additional layer`,
  },
  {
    keys: ['vpn', 'tunnel', 'remote access', 'wireguard', 'openvpn'],
    title: 'VPNs',
    answer: `A VPN (Virtual Private Network) creates an encrypted tunnel between your device and a server, masking your traffic.
**Corporate use case:** Secure remote access to internal resources.
**Privacy use case:** Prevents ISP surveillance and secures public Wi-Fi.

**Protocol comparison:**
• **WireGuard** — modern, fast, minimal attack surface (recommended)
• **OpenVPN** — battle-tested, flexible
• **IKEv2/IPSec** — mobile-friendly, auto-reconnects

**Security note:** A VPN is not a silver bullet — it doesn't protect against phishing, malware, or weak passwords.`,
  },
  {
    keys: ['incident response', 'ir plan', 'breach response', 'containment'],
    title: 'Incident Response',
    answer: `Incident Response (IR) is the structured process for handling cybersecurity breaches.
**PICERL Framework:**
1. **Preparation** — IR plan, SIEM, backups, team training
2. **Identification** — detect and confirm the incident
3. **Containment** — isolate affected systems to stop spread
4. **Eradication** — remove malware, close vulnerabilities
5. **Recovery** — restore systems from clean backups
6. **Lessons Learned** — post-incident review and improvement

**Golden rule:** Document everything — timestamps, actions taken, evidence collected.`,
  },
  {
    keys: ['website', 'fake website', 'url', 'domain spoofing', 'lookalike'],
    title: 'Fake Website Detection',
    answer: `Criminals create convincing lookalike websites to steal credentials.
**Red flags to inspect:**
• URL typos: paypa1.com, arnazon.com, g00gle.com
• Missing padlock / invalid SSL certificate
• HTTP instead of HTTPS on login pages
• Recent domain registration (check WHOIS)
• Mismatched favicon or logo quality
• Unusual domain extensions (.xyz, .tk, .ml)

**Best practice:** Bookmark trusted sites, use a password manager (it won't auto-fill on fakes), and verify SSL certificates.`,
  },
];

// ── Simple LLM fallback: keyword matching ─────────────────────
function localAnswer(message) {
  const lower = message.toLowerCase();
  const match = KB.find(entry => entry.keys.some(k => lower.includes(k)));
  if (match) {
    return `**${match.title}**\n\n${match.answer}`;
  }
  return `That's a great cybersecurity question! Here are some general security principles:
  
• **Think before you click** — Pause and verify before opening links or attachments
• **Verify identity** — Confirm who you're really communicating with through separate channels
• **Least privilege** — Only grant the minimum permissions necessary
• **Defence in depth** — Layer multiple security controls
• **Keep everything updated** — Patches close known vulnerabilities immediately

For more specific guidance, ask me about: phishing, malware, passwords, MFA, firewalls, VPNs, encryption, SQL injection, incident response, or DDoS attacks.`;
}

// ── POST /api/cybermentor/chat ─────────────────────────────────
const chat = async (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ message: 'Message is required' });
  }

  try {
    // Try Groq first if key is set
    if (process.env.GROQ_API_KEY) {
      const body = JSON.stringify({
        model: 'mixtral-8x7b-32768',
        messages: [
          {
            role: 'system',
            content: `You are CyberMentor, an expert cybersecurity training assistant embedded in the CyberMirror platform.
Provide clear, educational, actionable answers to cybersecurity questions.
Keep responses concise (under 250 words), use bullet points, and relate answers to real-world scenarios.
Never assist with actual attacks — only defensive, educational content.`,
          },
          { role: 'user', content: message.trim() },
        ],
        temperature: 0.4,
        max_tokens: 512,
      });

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body,
      });

      if (response.ok) {
        const data = await response.json();
        return res.json({ reply: data.choices[0].message.content });
      }
    }

    // Try OpenAI if key is set
    if (process.env.OPENAI_API_KEY) {
      const body = JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are CyberMentor, an expert cybersecurity training assistant. Provide clear, concise, defensive-only cybersecurity guidance.',
          },
          { role: 'user', content: message.trim() },
        ],
        temperature: 0.4,
        max_tokens: 512,
      });

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body,
      });

      if (response.ok) {
        const data = await response.json();
        return res.json({ reply: data.choices[0].message.content });
      }
    }

    // Fallback: local knowledge base
    return res.json({ reply: localAnswer(message) });
  } catch (err) {
    // Always fall back gracefully
    return res.json({ reply: localAnswer(message) });
  }
};

module.exports = { chat };

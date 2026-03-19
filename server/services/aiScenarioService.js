/**
 * aiScenarioService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * AI Scenario Generator for CyberMirror
 *
 * Dynamically generates randomised, difficulty-scaled cybersecurity training
 * scenarios across three categories: phishing · website · ransomware.
 *
 * Public API
 *   generateScenario(playerSkillLevel, category) → Scenario
 *
 * Scenario shape matches the existing CyberMirror format (see Scenario.js model).
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS & DATA POOLS
═══════════════════════════════════════════════════════════════════════════ */

/** Skill → difficulty mapping (inclusive upper bounds) */
const SKILL_TO_DIFFICULTY = [
  { maxSkill: 25,  difficulty: 'beginner'     },
  { maxSkill: 50,  difficulty: 'intermediate' },
  { maxSkill: 75,  difficulty: 'advanced'     },
  { maxSkill: 100, difficulty: 'expert'       },
];

/** Base point value per difficulty tier */
const DIFFICULTY_POINTS = {
  beginner:     40,
  intermediate: 60,
  advanced:     80,
  expert:       100,
};

// ── Attacker personas ────────────────────────────────────────────────────────
const ATTACKER_PERSONAS = [
  'Nigerian advance-fee scammer',
  'Eastern-European ransomware group',
  'Disgruntled insider threat',
  'Nation-state APT actor',
  'Opportunistic script kiddie',
  'Organised financial fraud ring',
  'Corporate espionage operative',
  'Hacktivism collective',
];

const URGENCY_LEVELS    = ['low', 'medium', 'high', 'extreme'];
const TARGET_ROLES      = ['employee', 'finance department staff', 'administrator', 'IT helpdesk', 'C-suite executive', 'HR manager'];
const DELIVERY_METHODS  = ['phishing email', 'SMS smishing', 'fake web portal', 'vishing call', 'malicious QR code', 'compromised advertisement'];
const EMOTIONAL_TRIGGERS = ['fear of account loss', 'urgency / time pressure', 'authority impersonation', 'financial reward', 'curiosity', 'social proof'];

// ── Domain building blocks ────────────────────────────────────────────────────
const LEGITIMATE_BRANDS  = ['paypal', 'microsoft', 'amazon', 'google', 'netflix', 'apple', 'dropbox', 'linkedin', 'bankofamerica', 'hsbc', 'fedex', 'dhl'];
const TLDS               = ['.com', '.net', '.org', '.info', '.io', '.co', '.biz', '.online'];
const SPOOF_SUFFIXES     = ['-secure', '-alert', '-verify', '-login', '-update', '-support', '-account', '-helpdesk'];
const SPOOF_PREFIXES     = ['secure-', 'alert-', 'verify-', 'login-', 'update-', 'support-', 'account-', 'my-', 'safe-'];
const TYPO_SUBSTITUTES   = { a: '4', e: '3', o: '0', i: '1', s: '5', l: '1' };

// ── Sender name pools ─────────────────────────────────────────────────────────
const FIRST_NAMES = ['James', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Robert', 'Laura', 'Chris', 'Amanda', 'Kevin', 'Natasha'];
const LAST_NAMES  = ['Wilson', 'Thompson', 'Patel', 'Garcia', 'Mitchell', 'O\'Brien', 'Chen', 'Kumar', 'Novak', 'Hassan', 'Reid', 'Kowalski'];
const DEPARTMENTS = ['IT Security', 'Human Resources', 'Finance & Payroll', 'Executive Office', 'Compliance', 'Operations'];

// ── Email subject pools (by difficulty) ──────────────────────────────────────
const EMAIL_SUBJECTS = {
  beginner: [
    'URGENT!! Your account has been HACKED!!!',
    'You won a $1000 gift card – claim NOW!!!',
    'Your password expire today – click here',
    'Important: Verify you account immediately',
    'FREE iPhone 15 – Limited offer!!!',
  ],
  intermediate: [
    'Action Required: Unusual sign-in activity detected',
    'Payroll update — please verify your bank details',
    'Your invoice #INV-2024-0891 is ready for review',
    'HR Policy Update — Mandatory Acknowledgement Needed',
    'Your cloud storage is 98% full — upgrade now',
  ],
  advanced: [
    'Re: Q4 Budget Review — Confidential Attachment',
    'DocuSign: Your signature is required on contract #9823',
    'IT Security Advisory: Mandatory VPN Certificate Renewal',
    'Password Reset Request — originated from your IP',
    'Board Meeting Prep — urgent document attached',
  ],
  expert: [
    'Re: Your earlier enquiry — account details enclosed',
    'Annual Security Audit — Required MFA Re-enrolment by EOD',
    'Sensitive: Director-level compensation adjustments attached',
    'Follow-up from our call — please review the NDA draft',
    'CISO Alert: Zero-day patch requires immediate credential rotation',
  ],
};

// ── Fake website names ────────────────────────────────────────────────────────
const FAKE_SITE_NAMES = {
  banking:    ['SecureBank Portal', 'TrustNet Banking', 'SafePay Online', 'ClearBank Verify'],
  social:     ['MetaID Verify', 'ConnectSafe Login', 'SocialGuard Auth', 'ProfileSecure'],
  corporate:  ['CorpSSO Gateway', 'WorkplaceID Portal', 'EnterpriseLogin', 'StaffConnect Hub'],
  government: ['GovID Verify Portal', 'CitizenServices Auth', 'TaxPortal Secure', 'HMRC Online Verify'],
  cloud:      ['CloudVault Secure', 'DriveProtect Login', 'StorageID Auth', 'BackupSecure Portal'],
};

// ── Targeted data fields ──────────────────────────────────────────────────────
const DATA_FIELD_SETS = {
  banking:    ['Account number', 'Sort code', 'Date of birth', 'Mother\'s maiden name', 'One-time passcode'],
  social:     ['Email address', 'Password', 'Recovery phone number', 'Date of birth'],
  corporate:  ['Employee ID', 'Active Directory password', 'MFA OTP code', 'VPN credentials'],
  government: ['National Insurance / Social Security number', 'Date of birth', 'Address', 'Tax reference number'],
  cloud:      ['Email', 'Password', 'Backup recovery key', 'Credit card for "verification"'],
};

// ── Ransomware infection vectors ──────────────────────────────────────────────
const INFECTION_VECTORS = [
  { method: 'Malicious email attachment',         file: 'Invoice_Q4_2024.docm',    vector: 'macro-enabled Word document' },
  { method: 'Infected USB drive',                 file: 'CompanyFiles.exe',         vector: 'autorun executable on removable media' },
  { method: 'Phishing link to payload dropper',   file: 'HR_Policy_Update.pdf.exe', vector: 'double-extension executable disguised as PDF' },
  { method: 'Remote Desktop Protocol brute-force',file: 'N/A',                     vector: 'weak RDP credentials exposed to internet' },
  { method: 'Supply chain software update',       file: 'SoftwareUpdater_v3.1.exe', vector: 'trojanised legitimate software update package' },
  { method: 'Drive-by download via malvertising', file: 'FlashUpdate.exe',          vector: 'browser exploit triggered by malicious ad' },
];

// ── Recovery options pool ─────────────────────────────────────────────────────
const RECOVERY_OPTIONS = [
  'Restore from isolated, clean offline backup',
  'Engage incident response team and forensics',
  'Notify relevant data protection authority (GDPR/CCPA)',
  'Rebuild affected systems from golden image',
  'Apply decryption key if law enforcement provides one',
  'Conduct post-incident review and patch root cause',
];

/* ═══════════════════════════════════════════════════════════════════════════
   UTILITY / RANDOMISATION HELPERS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Return a random element from an array.
 * @param {Array} array
 * @returns {*}
 */
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Return n unique random elements from an array (no repeats).
 * @param {Array} array
 * @param {number} n
 * @returns {Array}
 */
function getRandomElements(array, n) {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, array.length));
}

/**
 * Generate a fake spoofed domain name.
 * Difficulty determines how convincing the spoof is.
 * @param {string} difficulty
 * @returns {string}
 */
function generateFakeDomain(difficulty) {
  const brand = getRandomElement(LEGITIMATE_BRANDS);

  switch (difficulty) {
    case 'beginner':
      // Obvious fake TLD + unrelated brand
      return `${brand}-${getRandomElement(['lucky', 'free', 'win', 'prize', 'alert'])}${getRandomElement(['.info', '.biz', '.xyz', '.click'])}`;

    case 'intermediate': {
      // Suffix/prefix spoofing
      const usePrefix = Math.random() > 0.5;
      return usePrefix
        ? `${getRandomElement(SPOOF_PREFIXES)}${brand}${getRandomElement(TLDS)}`
        : `${brand}${getRandomElement(SPOOF_SUFFIXES)}${getRandomElement(TLDS)}`;
    }

    case 'advanced': {
      // Typosquatting — substitute one character
      const chars = brand.split('');
      const idx   = Math.floor(Math.random() * chars.length);
      if (TYPO_SUBSTITUTES[chars[idx]]) {
        chars[idx] = TYPO_SUBSTITUTES[chars[idx]];
      } else {
        chars.splice(idx + 1, 0, chars[idx]); // double a character
      }
      return `${chars.join('')}${getRandomElement(['.com', '.net'])}`;
    }

    case 'expert':
    default: {
      // Subdomain abuse on legit-looking TLD
      const sub = getRandomElement(['secure', 'auth', 'login', 'verify', 'account', 'portal']);
      return `${sub}.${brand}-${getRandomElement(['corp', 'inc', 'group', 'global'])}${getRandomElement(['.com', '.net'])}`;
    }
  }
}

/**
 * Generate a realistic-sounding attacker name/alias.
 * @returns {string}
 */
function generateAttackerName() {
  const aliases = ['Phantom_r00t', 'DarkSpider99', 'CryptoX', 'SilentSerpent', 'VectorZero', 'GhostByte'];
  if (Math.random() > 0.5) {
    return `${getRandomElement(FIRST_NAMES)} ${getRandomElement(LAST_NAMES)}`;
  }
  return getRandomElement(aliases);
}

/**
 * Generate an email subject appropriate for the difficulty tier.
 * @param {string} difficulty
 * @returns {string}
 */
function generateEmailSubject(difficulty) {
  return getRandomElement(EMAIL_SUBJECTS[difficulty] || EMAIL_SUBJECTS.intermediate);
}

/**
 * Generate a realistic-looking malicious link using a fake domain.
 * @param {string} difficulty
 * @returns {string}
 */
function generateMaliciousLink(difficulty) {
  const domain = generateFakeDomain(difficulty);
  const paths  = ['/verify', '/update-account', '/login', '/confirm', '/secure/auth', '/portal/reset'];
  const params = ['?token=8f3Kx92', '?session=true&ref=email', '?uid=9283&verify=1', ''];
  return `https://${domain}${getRandomElement(paths)}${getRandomElement(params)}`;
}

/**
 * Build the attacker context metadata embedded in every scenario.
 * @returns {object}
 */
function buildAttackerProfile() {
  return {
    persona:         getRandomElement(ATTACKER_PERSONAS),
    urgencyLevel:    getRandomElement(URGENCY_LEVELS),
    target:          getRandomElement(TARGET_ROLES),
    deliveryMethod:  getRandomElement(DELIVERY_METHODS),
    emotionalHook:   getRandomElement(EMOTIONAL_TRIGGERS),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   STEP / CHOICE GENERATORS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Generate structured decision steps for a given category and difficulty.
 * Returns an array of step objects matching the existing Scenario model format.
 *
 * @param {string} category   - 'phishing' | 'website' | 'ransomware'
 * @param {string} difficulty - 'beginner' | 'intermediate' | 'advanced' | 'expert'
 * @param {object} context    - scenario-specific context (domain, subject, etc.)
 * @returns {Array<object>}
 */
function generateDecisionOptions(category, difficulty, context) {
  const pointsPerCorrect = DIFFICULTY_POINTS[difficulty] / 3; // spread over steps

  // Number of steps scales with complexity
  const stepCount = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 }[difficulty] || 2;

  const stepPools = {
    phishing: [
      {
        question: `You receive an email from "${context.senderEmail}" with subject "${context.subject}". What is your first action?`,
        choices: [
          { text: 'Click the link — it looks official',               isCorrect: false, points: 0,                  feedback: `❌ The domain "${context.domain}" is spoofed. Clicking exposes your credentials.` },
          { text: 'Check the sender domain for anomalies',            isCorrect: true,  points: pointsPerCorrect,   feedback: `✅ Correct. "${context.domain}" is not a legitimate domain for this organisation.` },
          { text: 'Reply asking for more information',                isCorrect: false, points: 0,                  feedback: '❌ Replying confirms your email is active and may trigger further social engineering.' },
          { text: 'Forward to colleagues to warn them',               isCorrect: false, points: 0,                  feedback: '❌ Forwarding spreads the phishing link to more potential victims.' },
        ],
      },
      {
        question: `The email contains a link to "${context.maliciousLink}". How do you assess this URL?`,
        choices: [
          { text: 'The URL looks fine — the brand name is in it',      isCorrect: false, points: 0,                  feedback: '❌ Attackers embed legitimate brand names in subdomains or paths to appear trustworthy.' },
          { text: 'Hover over the link to preview the real destination',isCorrect: true,  points: pointsPerCorrect,   feedback: '✅ Correct. Always preview URLs. Spoofed domains often differ by a single character.' },
          { text: 'Open it in Incognito — it\'s safe in private mode', isCorrect: false, points: 0,                  feedback: '❌ Incognito mode does not protect against phishing sites or credential harvesting.' },
          { text: 'Copy and open it — HTTPS means it\'s secure',       isCorrect: false, points: 0,                  feedback: '❌ HTTPS only encrypts traffic; attackers obtain free SSL certificates for phishing sites.' },
        ],
      },
      {
        question: 'The email creates extreme urgency, warning your account will be permanently deleted in 2 hours. What does this indicate?',
        choices: [
          { text: 'Legitimate services routinely set short deadlines',  isCorrect: false, points: 0,                  feedback: '❌ Legitimate organisations rarely impose 2-hour ultimatums via email.' },
          { text: 'A classic social engineering urgency trigger',       isCorrect: true,  points: pointsPerCorrect,   feedback: `✅ Correct. The emotional trigger used here is "${context.attacker.emotionalHook}" — a hallmark of phishing.` },
          { text: 'You should act fast and click the link',             isCorrect: false, points: 0,                  feedback: '❌ Urgency is manufactured to bypass your critical thinking. Pause and verify independently.' },
          { text: 'Call the number provided in the email to verify',    isCorrect: false, points: 0,                  feedback: '❌ Attackers often include fake support numbers that connect to themselves.' },
        ],
      },
      {
        question: 'After reporting the phishing email, what is the most effective next step for your organisation?',
        choices: [
          { text: 'Delete the email and take no further action',        isCorrect: false, points: 0,                  feedback: '❌ Deleting without reporting deprives the security team of threat intelligence.' },
          { text: 'Update your email filter rules and brief your team', isCorrect: true,  points: pointsPerCorrect,   feedback: '✅ Correct. Blocking indicators and raising awareness limits the blast radius of the attack.' },
          { text: 'Change your password on the suspicious website',     isCorrect: false, points: 0,                  feedback: '❌ Never interact with the malicious site. Change passwords on the real, legitimate site only.' },
          { text: 'Respond to the attacker to gather intelligence',     isCorrect: false, points: 0,                  feedback: '❌ This is dangerous without proper authorisation and training — leave this to SOC/threat intelligence teams.' },
        ],
      },
    ],

    website: [
      {
        question: `You land on "${context.siteName}" at "${context.maliciousLink}". What should you immediately inspect?`,
        choices: [
          { text: 'Check the site looks visually identical to the real one',  isCorrect: false, points: 0,                  feedback: '❌ Attackers clone legitimate sites pixel-perfectly. Visual appearance is not a trust signal.' },
          { text: 'Inspect the URL bar for domain discrepancies',              isCorrect: true,  points: pointsPerCorrect,   feedback: `✅ Correct. The domain "${context.domain}" is not the legitimate site. URL inspection is critical.` },
          { text: 'Log in — HTTPS padlock confirms it is genuine',             isCorrect: false, points: 0,                  feedback: '❌ HTTPS only confirms encrypted traffic, not site legitimacy. Phishing sites routinely use HTTPS.' },
          { text: 'Trust it if it loads fast — scam sites are usually slow',   isCorrect: false, points: 0,                  feedback: '❌ Page load speed is irrelevant to legitimacy. Modern phishing kits are highly optimised.' },
        ],
      },
      {
        question: `The page requests: ${context.dataFields.join(', ')}. Why is this suspicious?`,
        choices: [
          { text: 'Legitimate portals always ask for all this information',    isCorrect: false, points: 0,                  feedback: '❌ Legitimate services minimise data collection and never request credentials alongside OTPs in one step.' },
          { text: 'Collecting credentials + OTP simultaneously enables real-time pass-through attacks', isCorrect: true, points: pointsPerCorrect, feedback: '✅ Correct. Attackers relay credentials instantly to the real site while also capturing your MFA token.' },
          { text: 'The form is standard — all sites collect this',             isCorrect: false, points: 0,                  feedback: '❌ Over-collection is a red flag. Legitimate sites request the minimum data required.' },
          { text: 'Only worry if it asks for credit card details',             isCorrect: false, points: 0,                  feedback: '❌ Credential theft (username + password) is often more damaging than card theft due to account reuse.' },
        ],
      },
      {
        question: 'You notice the SSL certificate is issued to a different organisation than the one displayed. What is this called?',
        choices: [
          { text: 'A caching error — clear your browser and retry',            isCorrect: false, points: 0,                  feedback: '❌ This is not a caching issue. Certificate mismatches are a direct indicator of a spoofed site.' },
          { text: 'Certificate spoofing / domain mismatch — a phishing indicator', isCorrect: true, points: pointsPerCorrect, feedback: '✅ Correct. Always verify the certificate Subject matches the domain you expect.' },
          { text: 'Normal — CDNs often use shared certificates',               isCorrect: false, points: Math.floor(pointsPerCorrect * 0.3), feedback: '⚠️ Partially true for CDNs, but a certificate issued to an unrelated party is always suspicious.' },
          { text: 'The organisation saved money with a budget SSL provider',    isCorrect: false, points: 0,                  feedback: '❌ Legitimate organisations use certificates that match their domain. A mismatch is a serious red flag.' },
        ],
      },
      {
        question: 'What is the safest way to navigate to your bank or corporate portal?',
        choices: [
          { text: 'Click the link in the latest email from them',              isCorrect: false, points: 0,                  feedback: '❌ Email links can be spoofed even in otherwise legitimate-looking messages.' },
          { text: 'Type the URL manually or use a verified bookmark',          isCorrect: true,  points: pointsPerCorrect,   feedback: '✅ Correct. Manually typed or bookmarked URLs bypass link-based phishing entirely.' },
          { text: 'Search Google and click the first result',                  isCorrect: false, points: 0,                  feedback: '❌ Attackers pay for sponsored/SEO-poisoned search results that lead to fake portals.' },
          { text: 'Use the phone number on the email to confirm the URL',      isCorrect: false, points: 0,                  feedback: '❌ Phone numbers in phishing emails connect to attacker-controlled lines.' },
        ],
      },
    ],

    ransomware: [
      {
        question: `You receive a file called "${context.infectionFile}" via ${context.infectionMethod}. What should you do?`,
        choices: [
          { text: 'Open it — your antivirus would catch anything dangerous',   isCorrect: false, points: 0,                  feedback: `❌ Signature-based AV often fails against novel ransomware payloads. "${context.infectionFile}" is a known attack vector.` },
          { text: 'Verify the sender via a separate communication channel',    isCorrect: true,  points: pointsPerCorrect,   feedback: '✅ Correct. Always confirm unexpected attachments out-of-band before opening.' },
          { text: 'Open in a preview pane — that\'s safe',                    isCorrect: false, points: 0,                  feedback: '❌ Preview panes can trigger macro execution in Office documents.' },
          { text: 'Save it to a USB drive first to be safe',                   isCorrect: false, points: 0,                  feedback: '❌ Copying to USB can spread the infection to removable media and connected systems.' },
        ],
      },
      {
        question: 'After opening the attachment, files begin encrypting rapidly and a ransom note appears. What is your immediate priority?',
        choices: [
          { text: 'Pay the ransom quickly to minimise downtime',               isCorrect: false, points: 0,                  feedback: '❌ Payment funds criminal operations and does not guarantee decryption. Only ~65% of payers recover files.' },
          { text: 'Isolate the infected machine — disconnect network immediately', isCorrect: true, points: pointsPerCorrect, feedback: '✅ Correct. Immediate network isolation stops lateral movement and limits total blast radius.' },
          { text: 'Restart the computer to stop the encryption',               isCorrect: false, points: 0,                  feedback: '❌ Restarting may trigger additional payload stages or resume encryption on reboot.' },
          { text: 'Try to delete encrypted files to free up space',            isCorrect: false, points: 0,                  feedback: '❌ Deleting encrypted files removes any future recovery possibility. Preserve everything for forensics.' },
        ],
      },
      {
        question: `Attackers demand payment within ${context.timeWindow} hours. The ransom note references your organisation by name. What additional threat does this imply?`,
        choices: [
          { text: 'This is a generic automated attack — name inserted from file metadata', isCorrect: false, points: 0,     feedback: '❌ While possible, targeted naming combined with data exfiltration threats is increasingly common (double extortion).' },
          { text: 'Double extortion — attackers may have exfiltrated data before encrypting', isCorrect: true, points: pointsPerCorrect, feedback: '✅ Correct. Modern ransomware groups exfiltrate sensitive data first, threatening public release if ransom is not paid.' },
          { text: 'No additional threat — encryption is the only goal',        isCorrect: false, points: 0,                  feedback: '❌ Over 70% of enterprise ransomware attacks now include data exfiltration (double extortion).' },
          { text: 'It means decryption keys are ready and payment will work',  isCorrect: false, points: 0,                  feedback: '❌ Personalisation does not imply decryption reliability. Many groups disappear after payment.' },
        ],
      },
      {
        question: 'Post-incident: Which recovery approach is most appropriate for long-term resilience?',
        choices: [
          { text: 'Restore from the most recent network backup',               isCorrect: false, points: Math.floor(pointsPerCorrect * 0.5), feedback: '⚠️ Partially correct — but only if backup integrity and isolation were verified. Connected backups may also be encrypted.' },
          { text: 'Restore from verified, isolated offline backup + root cause analysis + patch root vulnerability', isCorrect: true, points: pointsPerCorrect, feedback: `✅ Correct. Best practice: ${getRandomElement(RECOVERY_OPTIONS)}.` },
          { text: 'Rebuild the one affected machine and resume operations',     isCorrect: false, points: 0,                  feedback: '❌ Without root cause analysis and patching, the attack vector remains open for re-infection.' },
          { text: 'Accept the downtime as a cost of doing business',           isCorrect: false, points: 0,                  feedback: '❌ Without remediation, the average time between re-infection after paying ransom is under 30 days.' },
        ],
      },
    ],
  };

  // Take the appropriate number of steps for this difficulty, in order
  return (stepPools[category] || stepPools.phishing).slice(0, stepCount);
}

/* ═══════════════════════════════════════════════════════════════════════════
   SCENARIO BUILDERS (per category)
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Build a phishing email scenario.
 * @param {string} difficulty
 * @returns {object} Raw scenario data
 */
function buildPhishingScenario(difficulty) {
  const attacker      = buildAttackerProfile();
  const firstName     = getRandomElement(FIRST_NAMES);
  const lastName      = getRandomElement(LAST_NAMES);
  const department    = getRandomElement(DEPARTMENTS);
  const domain        = generateFakeDomain(difficulty);
  const subject       = generateEmailSubject(difficulty);
  const maliciousLink = generateMaliciousLink(difficulty);
  const senderEmail   = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;

  // Difficulty-appropriate suspicious indicators
  const indicatorsByDifficulty = {
    beginner:     ['Multiple exclamation marks', 'Obvious grammar errors', 'Suspicious .info / .xyz domain', 'Generic greeting (Dear Customer)'],
    intermediate: ['Slight domain spoofing (extra word in domain)', 'Mild urgency language', 'Requests personal data via email link', 'Mismatched reply-to address'],
    advanced:     ['Convincing brand impersonation', 'Targeted messaging using your role', 'Near-legitimate domain (typosquatting)', 'Plausible pretext with correct terminology'],
    expert:       ['Near-perfect domain spoofing (subdomain abuse)', 'References a real prior communication', 'Subtle MFA bypass technique', 'No obvious grammatical errors', 'Dual-use payload (legitimate + malicious)'],
  };

  const indicators = getRandomElements(indicatorsByDifficulty[difficulty] || indicatorsByDifficulty.intermediate, 3);

  // Build context for step generation
  const context = { attacker, domain, subject, maliciousLink, senderEmail, indicators };

  const emailTypes = {
    beginner:     'Generic phishing blast',
    intermediate: 'Business email compromise attempt',
    advanced:     'Spear phishing targeting your role',
    expert:       'Multi-stage CEO fraud / BEC chain',
  };

  return {
    title:         `[${emailTypes[difficulty]}] ${subject}`,
    description:   `An email arrives from ${firstName} ${lastName} (${department}) at "${senderEmail}" — purportedly from a trusted organisation. ` +
                   `The attack employs ${attacker.emotionalHook} as a psychological lever, targeting ${attacker.target} via ${attacker.deliveryMethod}. ` +
                   `Urgency level: ${attacker.urgencyLevel.toUpperCase()}. Attributed to: ${attacker.persona}.`,
    category:      'phishing',
    difficulty,
    points:        DIFFICULTY_POINTS[difficulty],
    metadata: {
      senderName:   `${firstName} ${lastName}`,
      senderEmail,
      subject,
      indicators,
      attackIntent: `Credential harvesting via link redirection to ${domain}`,
      attacker,
    },
    steps: generateDecisionOptions('phishing', difficulty, context),
  };
}

/**
 * Build a fake login website scenario.
 * @param {string} difficulty
 * @returns {object} Raw scenario data
 */
function buildWebsiteScenario(difficulty) {
  const attacker   = buildAttackerProfile();
  const siteType   = getRandomElement(Object.keys(FAKE_SITE_NAMES));
  const siteName   = getRandomElement(FAKE_SITE_NAMES[siteType]);
  const domain     = generateFakeDomain(difficulty);
  const maliciousLink = generateMaliciousLink(difficulty);
  const dataFields = getRandomElements(DATA_FIELD_SETS[siteType] || DATA_FIELD_SETS.banking, 3);

  const uiElements = {
    beginner:     ['Blurry logo', 'Broken footer links', 'HTTP only (no padlock)', 'Generic "Verify Account" button'],
    intermediate: ['Slightly off-brand colour palette', 'SSL cert from unknown CA', 'Missing cookie consent banner', 'Redirect chain via URL shortener'],
    advanced:     ['Valid HTTPS certificate', 'Pixel-perfect logo clone', 'Autofill triggering on credential fields', 'Fake "security verified" badge'],
    expert:       ['Wildcard SSL cert matching brand subdomain', 'Real-time credential relay overlay', 'Session token theft via hidden iframe', 'MFA pass-through attack mechanism'],
  };

  const context = { attacker, siteName, domain, maliciousLink, dataFields };

  return {
    title:       `Fake ${siteType.charAt(0).toUpperCase() + siteType.slice(1)} Portal: "${siteName}"`,
    description: `A fraudulent login page impersonates a legitimate ${siteType} service. ` +
                 `Hosted at "${domain}", the page collects: ${dataFields.join(', ')}. ` +
                 `Attack goal: ${siteType === 'banking' ? 'Financial account takeover' : siteType === 'corporate' ? 'Corporate network access via credential stuffing' : 'Identity theft and account takeover'}. ` +
                 `Delivered via ${attacker.deliveryMethod} exploiting ${attacker.emotionalHook}.`,
    category:    'website',
    difficulty,
    points:      DIFFICULTY_POINTS[difficulty],
    metadata: {
      fakeSiteName:     siteName,
      fakeUrl:          maliciousLink,
      siteType,
      suspiciousUiEls:  getRandomElements(uiElements[difficulty] || uiElements.intermediate, 3),
      dataFieldsTargeted: dataFields,
      attackGoal:       siteType === 'banking' ? 'Credential + OTP theft enabling banking account takeover'
                      : siteType === 'corporate' ? 'VPN/SSO credential harvesting for network intrusion'
                      : 'Account takeover and identity theft',
      attacker,
    },
    steps: generateDecisionOptions('website', difficulty, context),
  };
}

/**
 * Build a ransomware attack story scenario.
 * @param {string} difficulty
 * @returns {object} Raw scenario data
 */
function buildRansomwareScenario(difficulty) {
  const attacker   = buildAttackerProfile();
  const vector     = getRandomElement(INFECTION_VECTORS);
  const timeWindow = { beginner: 72, intermediate: 48, advanced: 24, expert: 12 }[difficulty];

  const progressionStages = {
    beginner: [
      `Stage 1 — Initial Access: User opens ${vector.file} (${vector.vector}).`,
      'Stage 2 — Execution: Macro payload runs, ransomware binary dropped to %TEMP%.',
      'Stage 3 — Encryption: Local user files encrypted. Ransom note displayed.',
    ],
    intermediate: [
      `Stage 1 — Delivery: ${vector.method} delivers ${vector.file}.`,
      'Stage 2 — Execution & Persistence: Registry run key added. Encryption begins.',
      'Stage 3 — Impact: All user-accessible drives encrypted. Shadow copies deleted.',
      'Stage 4 — Demand: Ransom note with ${timeWindow}-hour deadline.',
    ],
    advanced: [
      `Stage 1 — Initial Access: ${vector.method} via ${vector.vector}.`,
      'Stage 2 — Privilege Escalation: Local admin token exploited.',
      'Stage 3 — Lateral Movement: Network shares enumerated and accessed.',
      'Stage 4 — Exfiltration: Sensitive files staged and exfiltrated to C2.',
      'Stage 5 — Encryption + Double Extortion: All drives and shares encrypted.',
    ],
    expert: [
      `Stage 1 — Reconnaissance: OSINT on target ${attacker.target}. Spear phishing crafted.`,
      `Stage 2 — Initial Access: ${vector.method} exploits ${attacker.target}.`,
      'Stage 3 — Persistence + Stealth: Living-off-the-land tools (LOLBins) used to evade EDR.',
      'Stage 4 — Credential Harvest: Mimikatz / LSASS dump extracts domain credentials.',
      'Stage 5 — Domain Compromise: Domain controller reached via lateral movement.',
      'Stage 6 — Exfiltration: Multi-terabyte exfiltration over encrypted C2 channel.',
      'Stage 7 — Mass Encryption: GPO pushed ransomware binary across all endpoints simultaneously.',
    ],
  };

  const context = {
    attacker,
    infectionMethod: vector.method,
    infectionFile:   vector.file,
    timeWindow,
  };

  return {
    title:       `Ransomware Incident: "${vector.method}" Attack Chain`,
    description: `A ${difficulty}-tier ransomware attack initiated by ${attacker.persona}. ` +
                 `Infection vector: ${vector.vector}. ` +
                 `Target: ${attacker.target}. Urgency: ${attacker.urgencyLevel.toUpperCase()}. ` +
                 `A ${timeWindow}-hour payment deadline is imposed.`,
    category:    'ransomware',
    difficulty,
    points:      DIFFICULTY_POINTS[difficulty],
    metadata: {
      infectionMethod:     vector.method,
      infectionFile:       vector.file,
      attackVector:        vector.vector,
      progressionStages:   progressionStages[difficulty] || progressionStages.intermediate,
      userDecisionPoints: ['Opening the attachment', 'Post-infection response', 'Ransom payment decision', 'Recovery strategy'],
      consequences:       ['Data encryption', 'Operational downtime', 'Potential data breach notification obligation', 'Reputational damage'],
      recoveryOptions:    getRandomElements(RECOVERY_OPTIONS, 3),
      timeWindowHours:    timeWindow,
      attacker,
    },
    steps: generateDecisionOptions('ransomware', difficulty, context),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   DIFFICULTY RESOLVER
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Resolve a numeric skill level (0-100) to a difficulty string.
 * @param {number} playerSkillLevel  - 0–100; also accepts a difficulty string directly
 * @returns {'beginner'|'intermediate'|'advanced'|'expert'}
 */
function resolveDifficulty(playerSkillLevel) {
  // Accept a pre-resolved string
  if (typeof playerSkillLevel === 'string') {
    const valid = ['beginner', 'intermediate', 'advanced', 'expert'];
    return valid.includes(playerSkillLevel) ? playerSkillLevel : 'beginner';
  }

  const skill = Math.max(0, Math.min(100, Number(playerSkillLevel) || 0));
  const tier  = SKILL_TO_DIFFICULTY.find(t => skill <= t.maxSkill);
  return tier ? tier.difficulty : 'expert';
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN EXPORTED FUNCTION
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Generate a dynamic cybersecurity training scenario.
 *
 * @param {number|string} playerSkillLevel
 *   Numeric 0–100 (maps to difficulty tier) OR a difficulty string
 *   ('beginner' | 'intermediate' | 'advanced' | 'expert').
 *
 * @param {string} [category='mixed']
 *   Target category: 'phishing' | 'website' | 'ransomware' | 'mixed'.
 *   'mixed' selects randomly from all three.
 *
 * @returns {{
 *   title: string,
 *   description: string,
 *   category: string,
 *   difficulty: string,
 *   points: number,
 *   metadata: object,
 *   steps: Array<{question: string, choices: Array<{text: string, isCorrect: boolean, points: number, feedback: string}>}>
 * }}
 */
function generateScenario(playerSkillLevel = 0, category = 'mixed') {
  const difficulty      = resolveDifficulty(playerSkillLevel);
  const resolvedCategory = category === 'mixed'
    ? getRandomElement(['phishing', 'website', 'ransomware'])
    : category;

  switch (resolvedCategory) {
    case 'phishing':
      return buildPhishingScenario(difficulty);
    case 'website':
      return buildWebsiteScenario(difficulty);
    case 'ransomware':
      return buildRansomwareScenario(difficulty);
    default:
      // Graceful fallback for unknown categories
      return buildPhishingScenario(difficulty);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   MODULE EXPORTS
═══════════════════════════════════════════════════════════════════════════ */

module.exports = {
  generateScenario,
  // Expose helpers for testing and external composition
  resolveDifficulty,
  generateFakeDomain,
  generateAttackerName,
  generateEmailSubject,
  generateMaliciousLink,
  generateDecisionOptions,
  getRandomElement,
  buildAttackerProfile,
};

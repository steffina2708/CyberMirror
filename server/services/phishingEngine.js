// Phishing detection utility helpers used by scenarios
const phishingIndicators = [
  { pattern: /urgent|immediately|action required/i, weight: 2 },
  { pattern: /verify your account|confirm your identity/i, weight: 2 },
  { pattern: /click here|click now/i, weight: 1 },
  { pattern: /prize|winner|congratulations/i, weight: 3 },
  { pattern: /password|credentials|login/i, weight: 1 },
  { pattern: /bank|paypal|amazon|microsoft/i, weight: 1 },
];

const analyzeEmail = (emailBody) => {
  let score = 0;
  const detected = [];
  for (const indicator of phishingIndicators) {
    if (indicator.pattern.test(emailBody)) {
      score += indicator.weight;
      detected.push(indicator.pattern.toString());
    }
  }
  return {
    isPhishing: score >= 4,
    riskScore: Math.min(score * 10, 100),
    indicators: detected,
  };
};

const analyzeDomain = (url) => {
  const suspicious = [
    /[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/,
    /\.ru$|\.cn$|\.tk$|\.ml$/,
    /paypa1|g00gle|arnazon|micros0ft/i,
    /login.*\.(?!com|org|net)/i,
  ];
  const flags = suspicious.filter(p => p.test(url));
  return { isSuspicious: flags.length > 0, flagCount: flags.length };
};

module.exports = { analyzeEmail, analyzeDomain };

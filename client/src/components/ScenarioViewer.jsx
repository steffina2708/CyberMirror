import React from 'react';

const EmailSim = ({ data, showRedFlags }) => {
  // Split body text on URLs to highlight phishing links
  const URL_RE = /(https?:\/\/\S+)/gi;
  const parts = (data.body || '').split(URL_RE);

  return (
    <div className="email-container">
      <div className="email-card">
        <div className="email-header">
          <div className="email-meta">
            <p><strong>From:</strong> {data.from}</p>
            <p><strong>To:</strong> {data.to || 'you@company.com'}</p>
          </div>
          <h2 className="email-subject">{data.subject}</h2>
        </div>
        <div className="email-body">
          {parts.map((part, i) =>
            /^https?:\/\//.test(part)
              ? <a
                  key={i}
                  href="#"
                  className={`phishing-link${showRedFlags ? ' red-flag' : ''}`}
                  onClick={e => e.preventDefault()}
                >{part}</a>
              : <span key={i}>{part}</span>
          )}
        </div>
      </div>
    </div>
  );
};

const BrowserSim = ({ data, showRedFlags }) => {
  // Detect suspicious URL patterns for visual warning
  const urlIsSuspicious = data.url && (
    /\d{1,3}\.\d{1,3}/.test(data.url) ||
    /secure[-_]|login[-_]|verify[-_]|update[-_]|account[-_]/i.test(data.url) ||
    /\.(tk|ml|ga|cf|gq)$/i.test(data.url) ||
    !/^https:\/\/(www\.)?[a-z0-9-]+\.(com|org|net|bank|gov)\//i.test(data.url)
  );

  const isSensitiveField = (label = '') =>
    /password|otp|pin|cvv|card|secret/i.test(label);

  return (
    <div className="bank-sim">
      {/* Browser chrome */}
      <div className="bank-browser-bar">
        <div className="browser-dots">
          <div className="browser-dot" style={{ background: '#ff5f57' }} />
          <div className="browser-dot" style={{ background: '#ffbd2e' }} />
          <div className="browser-dot" style={{ background: '#28c840' }} />
        </div>
        <div className={`bank-url-bar${urlIsSuspicious ? ' suspicious-url' : ''}`}>
          {urlIsSuspicious ? '\u26a0 ' : '\ud83d\udd12 '}{data.url}
        </div>
      </div>

      {/* Page content */}
      <div className="bank-content">
        <div className="bank-card">
          <div className="bank-header">
            <h3>{data.siteName}</h3>
            {data.description && <p>{data.description}</p>}
          </div>
          {data.formFields && (
            <div className="bank-form">
              {data.formFields.map((field, i) => (
                <div key={i} className="bank-field">
                  <label className="bank-label">{field.label}</label>
                  <input
                    className={`bank-input${showRedFlags && isSensitiveField(field.label) ? ' red-flag' : ''}`}
                    type={/password|pin|otp|cvv/i.test(field.label) ? 'password' : 'text'}
                    placeholder={field.placeholder}
                    readOnly
                  />
                </div>
              ))}
              <button className="bank-submit-btn">
                {data.submitLabel || 'Submit'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TextSim = ({ step }) => (
  <div style={{ whiteSpace: 'pre-line', fontSize: '0.95rem', lineHeight: 1.8, color: 'var(--text-primary)' }}>
    {step.description || step.content}
  </div>
);

const ScenarioViewer = ({ step, stepIndex, showRedFlags }) => {
  if (!step) return null;

  const hasMedia = (step.type === 'email' && step.emailData) ||
                   (step.type === 'browser' && step.browserData);

  return (
    <div className="scenario-viewer">
      <div className="scenario-header">
        Step {stepIndex + 1} — {step.type?.replace('-', ' ').toUpperCase() || 'SCENARIO'}
      </div>
      {(hasMedia || step.description) && (
        <div className="scenario-content">
          <div className="scenario-type-label">{step.title}</div>
          <div style={{ marginTop: 12 }}>
            {step.type === 'email' && step.emailData ? (
              <EmailSim data={step.emailData} showRedFlags={showRedFlags} />
            ) : step.type === 'browser' && step.browserData ? (
              <BrowserSim data={step.browserData} showRedFlags={showRedFlags} />
            ) : step.description ? (
              <TextSim step={step} />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScenarioViewer;

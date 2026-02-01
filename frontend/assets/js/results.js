import { askQuestion } from './api.js';

const els = {
  summary: null,
  actions: null,
  followups: null,
  raw: null,
  qaLog: null,
  question: null,
  askBtn: null,
  qaStatus: null,
  qaError: null,
};

function qs(id) { return document.getElementById(id); }

function getResults() {
  const raw = sessionStorage.getItem('meetingResults');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function pick(arrLike) {
  if (!arrLike) return [];
  if (Array.isArray(arrLike)) return arrLike;
  if (typeof arrLike === 'string') return arrLike.split(/\n|\r/).map(s => s.trim()).filter(Boolean);
  return [];
}

/**
 * Render the meeting summary section
 * Handles the new backend response format
 */
function renderSummary(data) {
  // Handle new API response structure: data.data.summary
  const summaryData = data.data?.summary || data.summary || {};
  
  let html = '';
  
  // Meeting summary text
  if (summaryData.meetingSummary) {
    html += `
      <div class="result-group">
        <div class="result-label">📝 Overview</div>
        <div class="result-value">${escapeHtml(summaryData.meetingSummary)}</div>
      </div>`;
  }
  
  // Participants
  if (summaryData.participants?.length > 0) {
    html += `
      <div class="result-group">
        <div class="result-label">👥 Participants</div>
        <div class="result-value">${escapeHtml(summaryData.participants.join(', '))}</div>
      </div>`;
  }
  
  // Key Points
  if (summaryData.keyPoints?.length > 0) {
    html += `
      <div class="result-group">
        <div class="result-label">📌 Key Points</div>
        <ul class="result-list">
          ${summaryData.keyPoints.map(p => `<li>${escapeHtml(p)}</li>`).join('')}
        </ul>
      </div>`;
  }
  
  // Decisions
  if (summaryData.decisions?.length > 0) {
    html += `
      <div class="result-group">
        <div class="result-label" style="color: var(--accent-green, #4ade80);">✅ Decisions Made</div>
        <ul class="result-list">
          ${summaryData.decisions.map(d => `<li>${escapeHtml(d)}</li>`).join('')}
        </ul>
      </div>`;
  }
  
  // Unresolved Issues (Merged with Risks if small, or separate)
  if (summaryData.unresolvedIssues?.length > 0) {
    html += `
      <div class="result-group">
        <div class="result-label" style="color: var(--accent-orange, #fb923c);">⚠️ Unresolved Issues</div>
        <ul class="result-list">
          ${summaryData.unresolvedIssues.map(i => `<li>${escapeHtml(i)}</li>`).join('')}
        </ul>
      </div>`;
  }

  // Risks
  if (summaryData.risks?.length > 0) {
    html += `
      <div class="result-group">
        <div class="result-label" style="color: var(--accent-red, #ef4444);">🚨 Risks Identified</div>
        <ul class="result-list">
          ${summaryData.risks.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
        </ul>
      </div>`;
  }
  
  // Topics
  if (summaryData.topics?.length > 0) {
     html += `
      <div class="result-group">
        <div class="result-label">🏷️ Topics</div>
        <div class="result-value" style="font-size: 12px; opacity: 0.8;">${escapeHtml(summaryData.topics.join(', '))}</div>
      </div>`;
  }
  
  // Fallback for old format or empty
  if (!html) {
    const items = pick(summaryData);
    html = items.length ? items.map(i => `<li>${escapeHtml(i)}</li>`).join('') : '<div style="padding: 20px; text-align: center; color: var(--text-dim);">No summary available.</div>';
  }
  
  els.summary.innerHTML = html;
}

/**
 * Render the action items section
 * Handles the new backend response format with flagged items
 */
function renderActions(data) {
  // Handle new API response structure: data.data.actionItems
  const actionsData = data.data?.actionItems || data.actionItems || {};
  const actions = actionsData.actionItems || actionsData.actions || data.action_items || [];
  
  let html = '';
  
  // Show summary stats if available
  if (actionsData.summary) {
    const s = actionsData.summary;
    html += `<div style="display: flex; gap: 12px; margin-bottom: 16px; font-size: 11px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.05);">
      <span style="color: var(--text-main);">📊 <strong>${s.totalTasks || 0}</strong> Tasks</span>
      <span style="color: var(--accent-green, #4ade80);">✅ <strong>${s.assignedTasks || 0}</strong> Assigned</span>
      <span style="color: var(--accent-orange, #fb923c);">⚠️ <strong>${s.flaggedItems || 0}</strong> Flagged</span>
    </div>`;
  }
  
  if (Array.isArray(actions) && actions.length > 0) {
    actions.forEach(item => {
      if (typeof item === 'string') {
        html += `<div class="action-card">${escapeHtml(item)}</div>`;
      } else {
        const task = item.task || item.title || item.name || 'Action item';
        const owner = item.owner || item.assignee || 'Unassigned';
        const deadline = item.deadline || item.due || 'No deadline';
        const priority = item.priority || 'medium';
        const flagged = item.flagged;
        
        html += `
        <div class="action-card" style="${flagged ? 'border-left: 3px solid var(--accent-orange);' : ''}">
          <div class="action-header">
            <div class="action-title">${flagged ? '⚠️ ' : ''}${escapeHtml(task)}</div>
            <span class="priority-badge priority-${priority}">${priority}</span>
          </div>
          <div class="action-meta">
            <span style="${owner === 'Unassigned' ? 'color: var(--accent-orange);' : 'color: var(--accent-blue);'}">
              👤 ${escapeHtml(owner)}
            </span>
            <span>📅 ${escapeHtml(deadline)}</span>
          </div>
          ${item.flagReason ? `<div style="margin-top: 8px; font-size: 11px; color: var(--accent-orange); background: rgba(251, 146, 60, 0.1); padding: 4px 8px; border-radius: 4px;">⚡ ${escapeHtml(item.flagReason)}</div>` : ''}
        </div>`;
      }
    });
  } else {
    html += '<div style="padding: 20px; text-align: center; color: var(--text-dim);">No tasks found.</div>';
  }
  
  els.actions.innerHTML = html;
}

/**
 * Render the follow-up recommendations section
 * Handles the new backend response format with escalations and meeting suggestions
 */
function renderFollowups(data) {
  // Handle new API response structure: data.data.followUps
  const followUpData = data.data?.followUps || data.followUps || {};
  const followUpActions = followUpData.followUpActions || followUpData.followups || data.follow_up || [];
  const escalations = followUpData.escalations || [];
  const nextMeeting = followUpData.nextMeetingSuggestion || {};
  
  let html = '';
  
  // Escalations (high priority)
  if (escalations.length > 0) {
    html += `
      <div class="result-group">
        <div class="result-label" style="color: var(--accent-red, #ef4444);">🚨 Escalations Required</div>
        ${escalations.map(esc => `
          <div class="followup-item" style="border-left: 3px solid var(--accent-red);">
             <div class="followup-content">
               <div style="font-weight: 600; color: #fff;">${escapeHtml(esc.issue)}</div>
               <div style="font-size: 12px; color: var(--text-dim); margin-top: 4px;">
                 Escalate to: <span style="color: var(--accent-red);">${escapeHtml(esc.escalateTo)}</span>
                 ${esc.reason ? ` — ${escapeHtml(esc.reason)}` : ''}
               </div>
             </div>
          </div>
        `).join('')}
      </div>`;
  }
  
  // Next Meeting Suggestion
  if (nextMeeting.recommended) {
    html += `
      <div class="result-group">
        <div class="result-label" style="color: var(--accent-blue, #3b82f6);">📅 Next Meeting</div>
        <div class="followup-item" style="display: block;">
           <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">${escapeHtml(nextMeeting.suggestedTimeframe || 'TBD')}</div>
           ${nextMeeting.agenda?.length > 0 ? `<div style="font-size: 12px; color: var(--text-dim);"><strong>Agenda:</strong> ${escapeHtml(nextMeeting.agenda.join(', '))}</div>` : ''}
           ${nextMeeting.requiredAttendees?.length > 0 ? `<div style="font-size: 12px; color: var(--text-dim); margin-top: 4px;"><strong>Req:</strong> ${escapeHtml(nextMeeting.requiredAttendees.join(', '))}</div>` : ''}
        </div>
      </div>`;
  }
  
  // Follow-up Actions
  if (Array.isArray(followUpActions) && followUpActions.length > 0) {
    const typeIcons = { meeting: '📅', email: '📧', escalation: '🚨', reminder: '⏰', review: '📋' };
    
    html += `<div class="result-group"><div class="result-label">Recommended Actions</div>`;
    followUpActions.forEach(action => {
      if (typeof action === 'string') {
        html += `<div class="followup-item">${escapeHtml(action)}</div>`;
      } else {
        html += `
        <div class="followup-item">
          <div class="followup-icon">${typeIcons[action.type] || '📌'}</div>
          <div class="followup-content">
            <div style="font-size: 13px; font-weight: 500;">${escapeHtml(action.action)}</div>
            <div style="display: flex; gap: 8px; margin-top: 4px; font-size: 11px; color: var(--text-dim);">
               ${action.suggestedDate ? `<span>📅 ${escapeHtml(action.suggestedDate)}</span>` : ''}
               ${action.reason ? `<span>💡 ${escapeHtml(action.reason)}</span>` : ''}
            </div>
          </div>
        </div>`;
      }
    });
    html += `</div>`;
  } else if (!escalations.length && !nextMeeting.recommended) {
    html += '<div style="padding: 20px; text-align: center; color: var(--text-dim);">No follow-ups available.</div>';
  }
  
  els.followups.innerHTML = html;
}

function renderRaw(data) {
  if (els.raw) {
    els.raw.textContent = JSON.stringify(data, null, 2);
  }
}

/**
 * Render metadata section if available
 */
/**
 * Render metadata section if available
 */
function renderMetadata(data) {
  const metadata = data.metadata || {};
  const processingTime = data.processingTime || '';
  const sessionId = data.sessionId || '';
  
  const metaContainer = document.getElementById('metadata') || els.raw;
  if (!metaContainer) return;

  if (Object.keys(metadata).length > 0 || processingTime) {
    const metaHtml = `
      <div style="font-size: 11px; color: var(--text-dim); padding: 8px; background: var(--bg-dark); border-radius: 4px; margin-bottom: 8px;">
        ${processingTime ? `⏱️ Processing: ${processingTime}` : ''} 
        ${metadata.participantCount ? `| 👥 ${metadata.participantCount} participants` : ''}
        ${metadata.actionItemCount ? `| ✅ ${metadata.actionItemCount} actions` : ''}
        ${metadata.followUpCount ? `| 🔄 ${metadata.followUpCount} follow-ups` : ''}
        ${metadata.hasEscalations ? '| 🚨 Has escalations' : ''}
        ${sessionId ? `<br>Session: ${sessionId}` : ''}
      </div>
    `;
    metaContainer.innerHTML = metaHtml;
  }
}

function escapeHtml(s) {
  return (s || '').toString()
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function loadQALog() {
  const raw = sessionStorage.getItem('qaLog');
  try { return raw ? JSON.parse(raw) : []; } catch { return []; }
}

function saveQALog(log) {
  sessionStorage.setItem('qaLog', JSON.stringify(log));
}

function renderQALog() {
  const log = loadQALog();
  if (log.length === 0) {
    els.qaLog.innerHTML = '<div style="color: var(--text-dim); font-size: 12px; padding: 8px;">💬 Ask questions about the meeting. Try: "What decisions were made?" or "Who is responsible for what?"</div>';
    return;
  }
  els.qaLog.innerHTML = log.map(m => {
    if (m.role === 'user') {
      return `<div class="bubble user"><b>You:</b> ${escapeHtml(m.text)}</div>`;
    } else {
      let html = `<div class="bubble ai"><b>AI:</b> ${escapeHtml(m.text)}`;
      if (m.confidence) {
        const confidenceColors = { high: '#4ade80', medium: '#fb923c', low: '#ef4444' };
        html += `<br><span style="font-size: 10px; color: ${confidenceColors[m.confidence]};">Confidence: ${m.confidence}</span>`;
      }
      if (m.relatedTopics?.length > 0) {
        html += `<br><span style="font-size: 10px; color: var(--text-dim);">Related: ${escapeHtml(m.relatedTopics.join(', '))}</span>`;
      }
      html += `</div>`;
      return html;
    }
  }).join('');
  els.qaLog.scrollTop = els.qaLog.scrollHeight;
}

function setLoading(isLoading) {
  els.qaStatus.style.display = isLoading ? 'inline-flex' : 'none';
  els.askBtn.disabled = isLoading;
}

function showError(message) {
  els.qaError.textContent = message;
  els.qaError.style.display = message ? 'block' : 'none';
}

async function onAsk() {
  showError('');
  const q = els.question.value.trim();
  if (!q) return;
  
  const log = loadQALog();
  log.push({ role: 'user', text: q });
  saveQALog(log);
  renderQALog();
  els.question.value = '';

  setLoading(true);
  try {
    const data = await askQuestion(q);
    const answer = data.answer || data.text || data.response || 'No answer provided.';
    const newLog = loadQALog();
    newLog.push({ 
      role: 'ai', 
      text: answer,
      confidence: data.confidence,
      relatedTopics: data.relatedTopics
    });
    saveQALog(newLog);
    renderQALog();
  } catch (e) {
    showError(e.message || 'Failed to get an answer.');
  } finally {
    setLoading(false);
  }
}

function init() {
  els.summary = qs('summary');
  els.actions = qs('actions');
  els.followups = qs('followups');
  els.raw = qs('raw');
  els.qaLog = qs('qaLog');
  els.question = qs('question');
  els.askBtn = qs('askBtn');
  els.qaStatus = qs('qaStatus');
  els.qaError = qs('qaError');

  const data = getResults();
  if (data) {
    renderSummary(data);
    renderActions(data);
    renderFollowups(data);
    renderMetadata(data);
    renderRaw(data);
  } else {
    els.summary.innerHTML = '<li>No results found. <a href="input.html" style="color: var(--accent-blue);">Process a transcript first</a>.</li>';
  }
  renderQALog();

  els.askBtn.addEventListener('click', onAsk);
  els.question.addEventListener('keydown', (e) => { if (e.key === 'Enter') onAsk(); });
}

document.addEventListener('DOMContentLoaded', init);

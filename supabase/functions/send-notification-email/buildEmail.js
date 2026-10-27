// Builds the email for one in-app notification. Plain JS (no Deno APIs) so it
// can be tested with Node as well.

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const isUrl = (value) => /^https?:\/\/\S+$/i.test(String(value || '').trim());

function formatWhen(iso, timeZone) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZone, timeZoneName: 'short',
  }).format(date);
}

/**
 * @param {object} input
 * @param {object} input.notification   row from public.notifications
 * @param {object} [input.application]  row from public.applications (optional)
 * @param {string} [input.companyName]
 * @param {string} [input.recipientName]
 * @param {string} input.appUrl         e.g. https://resumatch.vercel.app
 * @param {string} [input.timeZone]     IANA zone for interview times, e.g. Asia/Manila
 * @returns {{ subject, heading, message, detailsHtml, detailsText, actionUrl, actionLabel }}
 */
export function buildNotificationEmail({ notification, application, companyName, recipientName, appUrl, timeZone = 'Asia/Manila' }) {
  const base = String(appUrl || '').replace(/\/$/, '');
  const isRecruiterNotice = ['new_applicant', 'reapplied', 'withdrawn'].includes(notification.type);
  const actionUrl = isRecruiterNotice
    ? `${base}/recruiter-dashboard`
    : notification.application_id
      ? `${base}/candidate-dashboard?application=${encodeURIComponent(notification.application_id)}`
      : `${base}/candidate-dashboard`;

  const details = []; // [label, value, isLink]
  if (companyName && !isRecruiterNotice) details.push(['Company', companyName]);

  const status = application?.status;
  if (application && (notification.type === 'interview_updated' || status === 'Interview') && application.interview_at) {
    details.push(['When', formatWhen(application.interview_at, timeZone)]);
    if (application.interview_mode) details.push(['Format', application.interview_mode]);
    if (application.interview_location) {
      details.push([application.interview_mode === 'Video call' ? 'Link' : 'Where', application.interview_location, isUrl(application.interview_location)]);
    }
    if (application.interview_notes) details.push(['Message from the recruiter', application.interview_notes]);
  }
  if (application && status === 'Rejected' && notification.type === 'status_changed' && application.candidate_feedback) {
    details.push(['Feedback from the recruiter', application.candidate_feedback]);
  }

  const detailsHtml = details.map(([label, value, link]) => {
    const safe = escapeHtml(value).replace(/\n/g, '<br>');
    const shown = link ? `<a href="${escapeHtml(String(value).trim())}">${safe}</a>` : safe;
    return `<p style="margin:0 0 10px"><strong>${escapeHtml(label)}:</strong><br>${shown}</p>`;
  }).join('');
  const detailsText = details.map(([label, value]) => `${label}: ${value}`).join('\n');

  return {
    subject: notification.title || 'ResuMatch update',
    heading: recipientName ? `Hi ${recipientName},` : 'Hi,',
    message: notification.body || notification.title || 'There is an update on ResuMatch.',
    detailsHtml,
    detailsText,
    actionUrl,
    actionLabel: isRecruiterNotice ? 'Open your pipeline' : 'View application details',
  };
}

export const CANDIDATE_EMAIL_TYPES = ['status_changed', 'interview_updated'];
export const RECRUITER_EMAIL_TYPES = ['new_applicant', 'reapplied', 'withdrawn'];

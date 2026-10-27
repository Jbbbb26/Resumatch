import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppIcon from '../../../assets/Icon.png';

const LAST_UPDATED = 'October 26, 2026';

const DOCUMENTS = {
  terms: {
    title: 'Terms of Service',
    sections: [
      ['Using ResuMatch', 'ResuMatch connects job seekers with recruiters. By creating an account you agree to use it honestly: give accurate information about yourself, your experience and the jobs you post, and keep your password private.'],
      ['Accounts', 'You are responsible for activity on your account. Tell us if you think someone else has accessed it. We may suspend accounts that post misleading jobs, harass other users, or try to misuse or break the service.'],
      ['Job seekers', 'Match scores are estimates produced by comparing your resume with a job posting. They are not a guarantee of an interview or a job, and employers make their own hiring decisions.'],
      ['Recruiters', 'Only post real positions you are hiring for, describe them accurately, and use applicant information only to evaluate candidates for your roles. Do not share applicant details outside your hiring process.'],
      ['Content you upload', 'You keep ownership of your resume, company logo, photos and other content. You let ResuMatch store and display it as needed to run the service, for example showing your profile to recruiters you apply to.'],
      ['Changes and availability', 'ResuMatch is provided as is and may change, pause or stop features. If these terms change, the updated version will be posted on this page.'],
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    sections: [
      ['What we collect', 'Your name, email address and password (stored securely by our sign-in provider); your profile details; the resume you upload and the information read from it (experience, education, skills); applications, interview details and notifications; and, for recruiters, company details, logo, photos and job postings.'],
      ['How we use it', 'To create your account, build your profile, calculate match scores, show your application to the recruiter of each job you apply to, and send you notifications and emails about your account and applications.'],
      ['Automated resume reading and matching', 'Your resume is sent to Google’s Gemini AI service to read its contents and to create the numeric representation used for match scores. Match scores are calculated automatically and are only one input; recruiters make their own decisions.'],
      ['Who can see your information', 'Recruiters see the profile, resume and application details of candidates who apply to their jobs. Company profiles, logos and photos are public.'],
      ['Service providers', 'ResuMatch uses Supabase to store data and files and to manage sign-in, Google Gemini to read resumes and calculate matches, and EmailJS to send verification codes and update emails. They process data only to provide these services.'],
      ['Security', 'Access to your data is limited by database rules, sign-in attempts are rate-limited, and passwords are never stored in plain text. No system is perfectly secure, so please use a strong, unique password.'],
      ['Your choices', 'You can view and correct your profile, replace or delete your resume, withdraw applications, and change your password at any time. To delete your account, contact the ResuMatch team.'],
      ['Changes', 'If this policy changes, the updated version will be posted on this page with a new date.'],
    ],
  },
};

export default function LegalPage({ type = 'terms' }) {
  const doc = DOCUMENTS[type] || DOCUMENTS.terms;
  const other = type === 'terms' ? { to: '/privacy', label: 'Privacy Policy' } : { to: '/terms', label: 'Terms of Service' };

  useEffect(() => {
    document.title = `${doc.title} | ResuMatch`;
    window.scrollTo(0, 0);
  }, [doc.title]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-slate-700">
      <header className="flex items-center justify-between bg-white px-6 py-4 shadow-sm">
        <Link to="/login" className="flex items-center gap-2">
          <img src={AppIcon} alt="ResuMatch Logo" className="h-10 w-10 rounded object-cover" />
          <span className="font-serif text-xl font-bold text-slate-900">ResuMatch</span>
        </Link>
        <Link to={other.to} className="text-sm font-medium text-indigo-600 hover:underline">{other.label}</Link>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="font-serif text-3xl font-bold text-slate-900">{doc.title}</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated {LAST_UPDATED}</p>
        <div className="mt-8 space-y-7 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          {doc.sections.map(([heading, body], index) => (
            <section key={heading}>
              <h2 className="text-base font-bold text-slate-900">{index + 1}. {heading}</h2>
              <p className="mt-2 text-sm leading-7">{body}</p>
            </section>
          ))}
        </div>
        <p className="mt-8 text-sm">
          <Link to="/login" className="font-medium text-indigo-600 hover:underline">← Back to sign in</Link>
        </p>
      </main>
    </div>
  );
}

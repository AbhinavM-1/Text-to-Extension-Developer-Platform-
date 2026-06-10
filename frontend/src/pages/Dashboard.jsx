import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Activity,
  Bell,
  BarChart3,
  Boxes,
  ChevronLeft,
  Command,
  Copy,
  CreditCard,
  Download,
  FileArchive,
  History,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Plus,
  Receipt,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  UserCircle,
  WandSparkles,
  Zap,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import clsx from 'clsx';
import Layout from '../components/Layout.jsx';
import FileViewer from '../components/FileViewer.jsx';
import { apiRequest, downloadUrl } from '../services/api.js';
import { useAuth } from '../services/auth.jsx';

const promptSuggestions = [
  'Create a Chrome extension that replaces all website images with red boxes.',
  'Build an extension that blocks all YouTube Shorts.',
  'Create a dark mode extension with a popup toggle.',
  'Highlight all links on a page in yellow.',
  'Show reading time for every article.',
];

const generationSteps = [
  'Analyzing Prompt...',
  'Generating Manifest...',
  'Creating Scripts...',
  'Validating Extension...',
  'Packaging ZIP...',
  'Ready For Download...',
];

const navItems = [
  ['Dashboard', LayoutDashboard],
  ['New Extension', Plus],
  ['My Extensions', Boxes],
  ['History', History],
  ['Analytics', BarChart3],
  ['Billing', CreditCard],
  ['Settings', Settings],
];

export default function Dashboard() {
  const { token, subscription, setSubscription, user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [extensions, setExtensions] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [activePage, setActivePage] = useState('Dashboard');
  const [prompt, setPrompt] = useState('Create a Chrome extension that replaces all website images with red boxes.');
  const [editPrompt, setEditPrompt] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [commandOpen, setCommandOpen] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [payments, setPayments] = useState([]);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [activityItems, setActivityItems] = useState([]);
  const [dailyUsage, setDailyUsage] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('extensio-theme') || 'dark');

  const selected = useMemo(() => extensions.find(item => item._id === selectedId) || extensions[0], [extensions, selectedId]);
  const storageKb = Math.max(1, Math.round(JSON.stringify(extensions).length / 1024));
  const notifications = useMemo(() => {
    const extensionItems = extensions.slice(0, 2).map(item => ({
      id: `extension:${item._id}`,
      title: item.name,
      description: 'Extension generated and ready to manage',
      page: 'My Extensions',
      createdAt: item.updatedAt || item.createdAt,
      type: 'extension',
    }));
    const paymentItems = payments.slice(0, 2).map(item => ({
      id: `payment:${item._id}`,
      title: `${item.plan} ${item.status}`,
      description: `Payment ${item.status} for ${item.billingCycle} billing`,
      page: 'Billing',
      createdAt: item.paidAt || item.updatedAt || item.createdAt,
      type: 'payment',
    }));
    return [...paymentItems, ...extensionItems]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 4);
  }, [extensions, payments]);

  const loadExtensions = useCallback(async (q = '') => {
    const data = await apiRequest(`/api/extensions${q ? `?search=${encodeURIComponent(q)}` : ''}`, { token });
    const items = Array.isArray(data) ? data : data.items || [];
    setExtensions(items);
    setSelectedId(current => current || items[0]?._id || '');
  }, [token]);

  const loadPayments = useCallback(async () => {
    const data = await apiRequest('/api/subscriptions/payments', { token });
    setPayments(data.items || []);
  }, [token]);

  const loadPaymentConfig = useCallback(async () => {
    const data = await apiRequest('/api/subscriptions/payment-config', { token });
    setPaymentConfig(data);
  }, [token]);

  const loadActivity = useCallback(async () => {
    const data = await apiRequest('/api/activity/me', { token });
    setActivityItems(data.items || []);
    setDailyUsage(data.dailyUsage || null);
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadExtensions();
    loadPayments().catch(() => {});
    loadPaymentConfig().catch(() => {});
    loadActivity().catch(() => {});
  }, [loadActivity, loadExtensions, loadPaymentConfig, loadPayments]);

  useEffect(() => {
    const handler = event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(value => !value);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const isLight = theme === 'light';
    document.documentElement.classList.remove('light-theme');
    document.documentElement.classList.toggle('theme-light', isLight);
    document.documentElement.classList.toggle('theme-dark', !isLight);
    localStorage.setItem('extensio-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!loading) return undefined;
    const interval = setInterval(() => {
      setProgressStep(step => Math.min(step + 1, generationSteps.length - 1));
    }, 650);
    return () => clearInterval(interval);
  }, [loading]);

  async function generate(event) {
    event.preventDefault();
    setProgressStep(0);
    setLoading(true);
    const toastId = toast.loading('Generating extension with AI...');
    try {
      const extension = await apiRequest('/api/extensions/generate', {
        token,
        method: 'POST',
        body: JSON.stringify({ prompt }),
      });
      await loadExtensions();
      await loadActivity().catch(() => {});
      setSelectedId(extension._id);
      setActivePage('History');
      toast.success('Extension ZIP is ready', { id: toastId });
    } catch (err) {
      toast.error(err.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  async function edit(event) {
    event.preventDefault();
    if (!selected) return;
    setProgressStep(0);
    setLoading(true);
    const toastId = toast.loading('Applying edit request...');
    try {
      const extension = await apiRequest(`/api/extensions/${selected._id}/edit`, {
        token,
        method: 'POST',
        body: JSON.stringify({ editPrompt }),
      });
      await loadExtensions();
      await loadActivity().catch(() => {});
      setSelectedId(extension._id);
      setEditPrompt('');
      toast.success('New version created', { id: toastId });
    } catch (err) {
      toast.error(err.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  async function removeExtension(id) {
    await apiRequest(`/api/extensions/${id}`, { token, method: 'DELETE' });
    await loadExtensions();
    await loadActivity().catch(() => {});
    if (selectedId === id) setSelectedId('');
    toast.success('Extension deleted');
  }

  async function duplicateExtension(id) {
    const toastId = toast.loading('Duplicating extension...');
    try {
      const extension = await apiRequest(`/api/extensions/${id}/duplicate`, { token, method: 'POST' });
      await loadExtensions();
      await loadActivity().catch(() => {});
      setSelectedId(extension._id);
      setActivePage('My Extensions');
      toast.success('Extension duplicated', { id: toastId });
    } catch (error) {
      toast.error(error.message, { id: toastId });
    }
  }

  async function choosePlan(plan, billingCycle = 'monthly', paymentMethod = 'upi') {
    if (plan === 'free') {
      const data = await apiRequest('/api/subscriptions/checkout', {
        token,
        method: 'POST',
        body: JSON.stringify({ plan }),
      });
      setSubscription(data.subscription);
      await loadActivity().catch(() => {});
      toast.success('Switched to Free plan');
      return;
    }

    const config = await apiRequest('/api/subscriptions/payment-config', { token });
    setPaymentConfig(config);
    if (!config.configured) {
      throw new Error(config.message || 'Razorpay is not configured yet.');
    }

    await loadRazorpayCheckout();

    const orderData = await apiRequest('/api/subscriptions/create-order', {
      token,
      method: 'POST',
      body: JSON.stringify({ plan, billingCycle, paymentMethod }),
    });

    const paymentResponse = await openRazorpayCheckout({
      keyId: orderData.keyId,
      order: orderData.order,
      plan,
      billingCycle,
      paymentMethod,
      user: orderData.user,
    });

    const verified = await apiRequest('/api/subscriptions/verify-payment', {
      token,
      method: 'POST',
      body: JSON.stringify({
        plan,
        billingCycle,
        paymentMethod,
        checkoutSessionId: orderData.checkoutSessionId,
        razorpayOrderId: paymentResponse.razorpay_order_id,
        razorpayPaymentId: paymentResponse.razorpay_payment_id,
        razorpaySignature: paymentResponse.razorpay_signature,
      }),
    });

    setSubscription(verified.subscription);
    await loadPayments();
    await loadActivity().catch(() => {});
    toast.success(`Payment verified: ${verified.receipt.reference}`);
  }

  function handleLogout() {
    logout();
    toast.success('Logged out');
    navigate('/login', { replace: true });
  }

  return (
    <Layout>
      <div className="min-h-screen bg-[#030712] text-[#F9FAFB]">
        <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} setPrompt={setPrompt} setActivePage={setActivePage} />

        <div className="flex">
          <aside className={clsx('sticky top-0 hidden h-screen shrink-0 border-r border-[#1F2937] bg-[#030712]/95 p-4 transition-all lg:block', sidebarOpen ? 'w-72' : 'w-20')}>
            <div className="flex items-center justify-between">
              {sidebarOpen && (
                <div>
                  <p className="text-lg font-black">Extensio.ai</p>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#00E599]">Factory OS</p>
                </div>
              )}
              <button onClick={() => setSidebarOpen(value => !value)} className="rounded-lg border border-[#1F2937] p-2 text-[#9CA3AF] hover:text-[#00E599]">
                {sidebarOpen ? <ChevronLeft size={18} /> : <Menu size={18} />}
              </button>
            </div>

            <nav className="mt-8 space-y-2">
              {navItems.map(([label, Icon]) => (
                <button key={label} onClick={() => setActivePage(label)} className={clsx('flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition', activePage === label ? 'bg-[#00E599]/10 text-[#00E599]' : 'text-[#9CA3AF] hover:bg-[#111827] hover:text-[#F9FAFB]')}>
                  <Icon size={18} />
                  {sidebarOpen && label}
                </button>
              ))}
            </nav>

            {sidebarOpen && (
              <button type="button" onClick={() => setCommandOpen(true)} className="absolute bottom-4 left-4 right-4 rounded-2xl border border-[#1F2937] bg-[#111827] p-4 text-left transition hover:border-[#00E599]/60 hover:bg-[#00E599]/5">
                <div className="flex items-center gap-2 text-sm font-black text-[#00E599]">
                  <Sparkles size={16} /> Prompt Library
                </div>
                <p className="mt-2 text-xs leading-5 text-[#9CA3AF]">Use Ctrl+K for global search, templates, and shortcuts.</p>
              </button>
            )}
          </aside>

          <main className="min-w-0 flex-1">
            <TopNav
              user={user}
              subscription={subscription}
              notifications={notifications}
              search={search}
              setSearch={setSearch}
              onSearch={() => { loadExtensions(search); setActivePage('My Extensions'); }}
              onCommand={() => setCommandOpen(true)}
              onNavigate={setActivePage}
              onLogout={handleLogout}
              theme={theme}
              setTheme={setTheme}
            />

            <AnimatePresence mode="wait">
              <motion.div key={activePage} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }} className="dashboard-content mx-auto w-full px-4 py-6 lg:px-6">
                <DashboardPage
                  activePage={activePage}
                  extensions={extensions}
                  selected={selected}
                  selectedId={selected?._id}
                  setSelectedId={setSelectedId}
                  removeExtension={removeExtension}
                  duplicateExtension={duplicateExtension}
                  prompt={prompt}
                  setPrompt={setPrompt}
                  generate={generate}
                  loading={loading}
                  progressStep={progressStep}
                  editPrompt={editPrompt}
                  setEditPrompt={setEditPrompt}
                  edit={edit}
                  subscription={subscription}
                  choosePlan={choosePlan}
                  payments={payments}
                  activityItems={activityItems}
                  dailyUsage={dailyUsage}
                  paymentConfig={paymentConfig}
                  storageKb={storageKb}
                  setActivePage={setActivePage}
                  user={user}
                  updateProfile={updateProfile}
                  theme={theme}
                  setTheme={setTheme}
                />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </Layout>
  );
}

function DashboardPage({
  activePage,
  extensions,
  selected,
  selectedId,
  setSelectedId,
  removeExtension,
  duplicateExtension,
  prompt,
  setPrompt,
  generate,
  loading,
  progressStep,
  editPrompt,
  setEditPrompt,
  edit,
  subscription,
  choosePlan,
  payments,
  activityItems,
  dailyUsage,
  paymentConfig,
  storageKb,
  setActivePage,
  user,
  updateProfile,
  theme,
  setTheme,
}) {
  if (activePage === 'New Extension') {
    return (
      <PageShell eyebrow="New Extension" title="Build a Chrome extension from one prompt" subtitle="Describe exactly what you need. Extensio.ai generates Manifest V3 files, validates them, and packages the ZIP.">
        <div className="grid gap-6 xl:grid-cols-[460px_1fr]">
          <section className="space-y-6">
            <PromptWorkspace prompt={prompt} setPrompt={setPrompt} generate={generate} loading={loading} />
            <GenerationProgress loading={loading} progressStep={progressStep} />
          </section>
          <section className="min-w-0 space-y-6">
            <SelectedExtension selected={selected} editPrompt={editPrompt} setEditPrompt={setEditPrompt} edit={edit} loading={loading} />
            <FileViewer extension={selected} />
          </section>
        </div>
      </PageShell>
    );
  }

  if (activePage === 'My Extensions') {
    return (
      <PageShell eyebrow="My Extensions" title="Manage every generated extension" subtitle="Open, edit, duplicate, download, or delete your extension projects from this workspace.">
        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <SearchAndHistory extensions={extensions} selectedId={selectedId} setSelectedId={setSelectedId} removeExtension={removeExtension} duplicateExtension={duplicateExtension} />
          <section className="min-w-0 space-y-6">
            <SelectedExtension selected={selected} editPrompt={editPrompt} setEditPrompt={setEditPrompt} edit={edit} loading={loading} />
            <FileViewer extension={selected} />
          </section>
        </div>
      </PageShell>
    );
  }

  if (activePage === 'History') {
    return (
      <PageShell eyebrow="History" title="Version history and generated files" subtitle="Review the latest selected extension, apply edit requests, and inspect generated code before downloading.">
        <div className="space-y-6">
          <SelectedExtension selected={selected} editPrompt={editPrompt} setEditPrompt={setEditPrompt} edit={edit} loading={loading} />
          <FileViewer extension={selected} />
        </div>
      </PageShell>
    );
  }

  if (activePage === 'Analytics') {
    return (
      <PageShell eyebrow="Analytics" title="Usage, downloads, and activity" subtitle="Track extension generation volume, downloads, and recent workspace events.">
        <div className="space-y-6">
          <AnalyticsSummary extensions={extensions} payments={payments} storageKb={storageKb} subscription={subscription} dailyUsage={dailyUsage} />
          <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <AnalyticsPanel extensions={extensions} payments={payments} />
            <ActivityFeed extensions={extensions} payments={payments} activityItems={activityItems} />
          </div>
        </div>
      </PageShell>
    );
  }

  if (activePage === 'Billing') {
    return (
      <PageShell compact eyebrow="Billing" title="Payment dashboard and subscription plans" subtitle="Free users get 5 extension generations per day. Upgrade with UPI, card, or netbanking when you need production-scale usage.">
        <BillingBoard subscription={subscription} choosePlan={choosePlan} payments={payments} paymentConfig={paymentConfig} />
      </PageShell>
    );
  }

  if (activePage === 'Settings') {
    return (
      <PageShell eyebrow="Settings" title="Workspace and security controls" subtitle="Manage profile preferences, API provider settings, theme controls, and team-ready configuration.">
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <ProfileSettings user={user} updateProfile={updateProfile} />
          <SettingsControls paymentConfig={paymentConfig} theme={theme} setTheme={setTheme} setActivePage={setActivePage} />
        </section>
      </PageShell>
    );
  }

  return (
    <div className="space-y-6">
      <HeroDashboard />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Generated Extensions" value={extensions.length} icon={Boxes} />
        <StatCard label="Extensions Today" value={formatDailyUsage(dailyUsage)} icon={Activity} />
        <StatCard label="Downloads" value={extensions.length * 3} icon={Download} />
        <StatCard label="Storage Used" value={`${storageKb} KB`} icon={FileArchive} />
        <StatCard label="Current Plan" value={(subscription?.plan || 'free').toUpperCase()} icon={Zap} />
      </section>
      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <QuickActionCard setActivePage={setActivePage} />
        <ActivityFeed extensions={extensions} payments={payments} activityItems={activityItems} />
      </div>
    </div>
  );
}

function PageShell({ eyebrow, title, subtitle, children, compact = false }) {
  return (
    <div className={clsx(compact ? 'space-y-4' : 'space-y-6')}>
      <section className={clsx('glass-panel', compact ? 'rounded-2xl p-3 lg:p-4' : 'rounded-3xl p-6 lg:p-8')}>
        <p className={clsx('font-black uppercase tracking-[0.24em] text-[#00E599]', compact ? 'text-[11px]' : 'text-sm')}>{eyebrow}</p>
        <h1 className={clsx('max-w-4xl font-black tracking-tight', compact ? 'mt-1 text-2xl lg:text-3xl' : 'mt-3 text-4xl lg:text-5xl')}>{title}</h1>
        <p className={clsx('max-w-3xl text-[#9CA3AF]', compact ? 'mt-1 text-xs leading-5' : 'mt-4 text-sm leading-6 lg:text-base')}>{subtitle}</p>
      </section>
      {children}
    </div>
  );
}

function QuickActionCard({ setActivePage }) {
  return (
    <section className="glass-panel rounded-2xl p-5">
      <SectionHeader eyebrow="Start here" title="Create, inspect, and ship from separate pages" />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ['New Extension', 'Open the prompt workspace and generate a new ZIP.', Plus],
          ['My Extensions', 'Browse all saved projects and manage downloads.', Boxes],
          ['History', 'Review the selected extension files and versions.', History],
          ['Billing', 'Upgrade limits and unlock advanced generation.', CreditCard],
        ].map(([title, text, Icon]) => (
          <button key={title} onClick={() => setActivePage(title)} className="rounded-2xl border border-[#1F2937] bg-[#030712] p-4 text-left transition hover:border-[#00E599]/50 hover:bg-[#00E599]/5">
            <Icon size={20} className="text-[#00E599]" />
            <p className="mt-3 font-black">{title}</p>
            <p className="mt-1 text-xs leading-5 text-[#9CA3AF]">{text}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

const billingPlans = {
  free: {
    name: 'Free',
    price: { monthly: 0, yearly: 0 },
    badge: 'Starter',
    description: 'Best for testing ideas and classroom demos.',
    features: ['5 extensions per day', 'ZIP downloads', 'Prompt history', 'Manifest V3 validation'],
  },
  pro: {
    name: 'Pro',
    price: { monthly: 799, yearly: 7990 },
    badge: 'Recommended',
    description: 'For creators shipping extension ideas regularly.',
    features: ['Unlimited generations', 'Edit request system', 'Version history', 'Priority ZIP packaging'],
  },
  premium: {
    name: 'Premium',
    price: { monthly: 1999, yearly: 19990 },
    badge: 'Teams',
    description: 'For production builds, teams, and API-call extensions.',
    features: ['API-call extensions', 'Team collaboration', 'Admin controls', 'Priority support'],
  },
};

const paymentMethods = [
  { id: 'upi', label: 'UPI', icon: Smartphone, helper: 'Pay with any UPI app' },
  { id: 'card', label: 'Card', icon: CreditCard, helper: 'Visa, Mastercard, RuPay' },
  { id: 'netbanking', label: 'Netbanking', icon: Landmark, helper: 'Major Indian banks' },
];

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Unable to load Razorpay Checkout. Check your internet connection.'));
    document.body.appendChild(script);
  });
}

function openRazorpayCheckout({ keyId, order, plan, billingCycle, paymentMethod, user }) {
  return new Promise((resolve, reject) => {
    const displaySequences = {
      upi: ['block.upi', 'block.cards', 'block.banks'],
      card: ['block.cards', 'block.upi', 'block.banks'],
      netbanking: ['block.banks', 'block.upi', 'block.cards'],
    };
    const display = {
      blocks: {
        upi: {
          name: 'Pay using UPI',
          instruments: [{ method: 'upi' }],
        },
        cards: {
          name: 'Pay using Card',
          instruments: [{ method: 'card' }],
        },
        banks: {
          name: 'Pay using Netbanking',
          instruments: [{ method: 'netbanking' }],
        },
      },
      sequence: displaySequences[paymentMethod] || displaySequences.upi,
      preferences: {
        show_default_blocks: true,
      },
    };

    const checkout = new window.Razorpay({
      key: keyId,
      amount: order.amount,
      currency: order.currency,
      name: 'Extensio.ai',
      description: `${billingPlans[plan].name} ${billingCycle} subscription`,
      order_id: order.id,
      method: {
        upi: true,
        card: true,
        netbanking: true,
        wallet: true,
      },
      prefill: {
        name: user?.name || '',
        email: user?.email || '',
      },
      notes: {
        plan,
        billingCycle,
        paymentMethod,
      },
      config: {
        display,
      },
      theme: {
        color: '#00E599',
      },
      handler: resolve,
      modal: {
        ondismiss: () => reject(new Error('Payment cancelled before completion')),
      },
    });

    checkout.on('payment.failed', response => {
      reject(new Error(response?.error?.description || 'Payment failed'));
    });

    checkout.open();
  });
}

function BillingBoard({ subscription, choosePlan, payments = [], paymentConfig }) {
  const [selectedPlan, setSelectedPlan] = useState(subscription?.plan === 'premium' ? 'premium' : subscription?.plan === 'pro' ? 'pro' : 'pro');
  const [billingCycle, setBillingCycle] = useState(subscription?.billingCycle || 'monthly');
  const [paymentMethod, setPaymentMethod] = useState(subscription?.paymentMethod === 'card' || subscription?.paymentMethod === 'netbanking' ? subscription.paymentMethod : 'upi');
  const [processing, setProcessing] = useState(false);
  const currentPlan = subscription?.plan || 'free';
  const plan = billingPlans[selectedPlan];
  const amount = plan.price[billingCycle];
  const yearlySavings = selectedPlan === 'free' ? 0 : (plan.price.monthly * 12) - plan.price.yearly;
  const paidPlanSelected = selectedPlan !== 'free';
  const gatewayReady = Boolean(paymentConfig?.configured);
  const checkoutDisabled = processing || currentPlan === selectedPlan || (paidPlanSelected && !gatewayReady);

  async function handleCheckout(event) {
    event.preventDefault();
    if (paidPlanSelected && !gatewayReady) {
      toast.error(paymentConfig?.message || 'Razorpay is not configured yet.');
      return;
    }
    setProcessing(true);
    try {
      await choosePlan(selectedPlan, billingCycle, selectedPlan === 'free' ? 'free' : paymentMethod);
    } catch (error) {
      toast.error(error.message || 'Unable to process checkout. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="grid min-w-0 items-start gap-4 2xl:grid-cols-[1.2fr_0.8fr]">
      <section className="flex flex-col gap-4">
        <div className="glass-panel rounded-2xl p-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <SectionHeader compact eyebrow="Plans" title="Choose your workspace limit" />
              <p className="mt-0.5 text-[11px] leading-4 text-[#9CA3AF]">Pricing is INR-first and tuned for student builders, hackathons, and early-stage creators.</p>
            </div>
            <div className="inline-flex rounded-xl border border-[#1F2937] bg-[#030712] p-1">
              {['monthly', 'yearly'].map(cycle => (
                <button key={cycle} onClick={() => setBillingCycle(cycle)} className={clsx('rounded-lg px-3 py-1.5 text-xs font-black capitalize transition', billingCycle === cycle ? 'premium-gradient text-[#030712]' : 'text-[#9CA3AF] hover:text-[#F9FAFB]')}>
                  {cycle}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid min-w-0 gap-3 md:grid-cols-3">
          {Object.entries(billingPlans).map(([key, item]) => {
            const active = currentPlan === key;
            const selected = selectedPlan === key;
            return (
              <motion.button
                key={key}
                type="button"
                whileHover={{ y: -2 }}
                onClick={() => setSelectedPlan(key)}
                className={clsx('billing-plan-card relative flex h-full flex-col rounded-2xl border p-4 text-left transition', selected ? 'billing-plan-card-selected border-[#00E599] bg-[#00E599]/10 shadow-2xl shadow-emerald-500/10' : 'border-[#1F2937] bg-[#111827]/80 hover:border-[#00E599]/50')}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-black">{item.name}</p>
                    <p className="mt-1 min-h-12 text-xs leading-5 text-[#9CA3AF]">{item.description}</p>
                  </div>
                  <span className={clsx('rounded-full px-2 py-0.5 text-[9px] font-black uppercase', item.badge === 'Recommended' ? 'premium-gradient text-[#030712]' : 'bg-[#030712] text-[#00E599]')}>
                    {active ? 'Current' : item.badge}
                  </span>
                </div>
                <p className="mt-4 text-2xl font-black">₹{item.price[billingCycle].toLocaleString('en-IN')}<span className="text-xs text-[#9CA3AF]">/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span></p>
                <div className="mt-4 space-y-2">
                  {item.features.map(feature => (
                    <p key={feature} className="billing-feature flex items-center gap-2 text-xs text-[#D1D5DB]">
                      <ShieldCheck size={13} className="text-[#00E599]" />
                      {feature}
                    </p>
                  ))}
                </div>
                <span className={clsx('billing-plan-action mb-3 mt-auto flex w-full items-center justify-center whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black transition', active ? 'billing-plan-action-current bg-[#1F2937] text-[#9CA3AF]' : selected ? 'premium-gradient text-[#030712]' : 'border border-[#1F2937] bg-[#030712] text-[#F9FAFB]')}>
                  {active ? 'Current plan' : `Choose ${item.name}`}
                </span>
              </motion.button>
            );
          })}
        </div>

      </section>

      <section className="glass-panel rounded-2xl p-4 2xl:sticky 2xl:top-24">
        <div className="flex items-start justify-between gap-4">
          <div>
            <SectionHeader compact eyebrow="Checkout" title="Secure payment" />
            <p className="mt-0.5 text-xs leading-5 text-[#9CA3AF]">Real Razorpay Checkout with UPI, card, and netbanking. Payment is verified on the server before the plan is activated.</p>
          </div>
          <span className="rounded-xl bg-[#00E599]/10 p-2 text-[#00E599]">
            <Receipt size={18} />
          </span>
        </div>

        <form onSubmit={handleCheckout} className="mt-3 space-y-2.5">
          {paidPlanSelected && (
            <>
              <div className="grid gap-2 sm:grid-cols-3">
                {paymentMethods.map(method => {
                  const Icon = method.icon;
                  return (
                    <button key={method.id} type="button" onClick={() => setPaymentMethod(method.id)} className={clsx('rounded-xl border p-2 text-left transition', paymentMethod === method.id ? 'border-[#00E599] bg-[#00E599]/10' : 'border-[#1F2937] bg-[#030712] hover:border-[#00E599]/50')}>
                      <Icon size={14} className="text-[#00E599]" />
                      <p className="mt-1 text-sm font-black">{method.label}</p>
                      <p className="mt-0.5 text-[10px] leading-4 text-[#9CA3AF]">{method.helper}</p>
                    </button>
                  );
                })}
              </div>

              <PaymentGatewayNotice paymentMethod={paymentMethod} />
              {!gatewayReady && <PaymentSetupNotice message={paymentConfig?.message} />}
            </>
          )}

          <div className="rounded-2xl border border-[#1F2937] bg-[#030712] p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#9CA3AF]">{plan.name} plan</span>
              <span className="font-black">₹{amount.toLocaleString('en-IN')}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-[#9CA3AF]">Billing cycle</span>
              <span className="font-black capitalize">{billingCycle}</span>
            </div>
            {yearlySavings > 0 && (
              <div className="mt-2 flex items-center justify-between text-sm text-[#00E599]">
                <span>Yearly savings</span>
                <span className="font-black">₹{yearlySavings.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="mt-3 border-t border-[#1F2937] pt-3">
              <div className="flex items-center justify-between">
                <span className="text-base font-black">Total due today</span>
                <span className="text-2xl font-black">₹{amount.toLocaleString('en-IN')}</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-[#9CA3AF]">Click checkout to open Razorpay. Payment credentials are handled securely by Razorpay, not stored in Extensio.ai.</p>
            </div>
          </div>

          <button disabled={checkoutDisabled} className="sticky bottom-4 z-10 flex w-full items-center justify-center gap-2 rounded-xl premium-gradient px-4 py-3 text-lg font-black text-[#030712] shadow-2xl shadow-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50">
            <ShieldCheck size={16} />
            {currentPlan === selectedPlan
              ? 'Current plan active'
              : processing
                ? 'Processing payment...'
                : selectedPlan === 'free'
                  ? 'Switch to Free'
                  : gatewayReady
                    ? `Pay ₹${amount.toLocaleString('en-IN')} securely`
                    : 'Configure Razorpay to enable checkout'}
          </button>

          <PaymentHistory payments={payments} />
        </form>
      </section>
    </div>
  );
}

function PaymentHistory({ payments }) {
  const latest = payments.slice(0, 3);

  return (
    <div className="rounded-2xl border border-[#1F2937] bg-[#030712] p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black">Payment history</p>
        <span className="rounded-full bg-[#111827] px-2 py-1 text-[10px] font-black uppercase text-[#00E599]">Server verified</span>
      </div>
      <div className="mt-3 space-y-2">
        {latest.length ? latest.map(payment => (
          <div key={payment._id} className="flex items-center justify-between gap-3 rounded-xl border border-[#1F2937] bg-[#111827] px-3 py-2">
            <div>
              <p className="text-xs font-black uppercase">{payment.plan} / {payment.billingCycle}</p>
              <p className="mt-0.5 text-[10px] text-[#9CA3AF]">{payment.razorpayPaymentId || payment.razorpayOrderId}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-black">₹{payment.amount.toLocaleString('en-IN')}</p>
              <p className={clsx('mt-0.5 text-[10px] font-black uppercase', payment.status === 'paid' ? 'text-[#00E599]' : payment.status === 'failed' ? 'text-red-300' : 'text-[#9CA3AF]')}>{payment.status}</p>
            </div>
          </div>
        )) : (
          <p className="rounded-xl border border-dashed border-[#1F2937] px-3 py-4 text-center text-xs leading-5 text-[#9CA3AF]">No payments yet. Your verified Razorpay receipts will appear here.</p>
        )}
      </div>
    </div>
  );
}

function PaymentGatewayNotice({ paymentMethod }) {
  const copy = {
    upi: ['UPI preferred', 'Razorpay will open checkout with UPI preferred and will also show other enabled methods if UPI is unavailable in test mode.'],
    card: ['Card preferred', 'Razorpay will open checkout with cards preferred and will complete OTP/3DS securely inside Razorpay.'],
    netbanking: ['Netbanking preferred', 'Razorpay will open checkout with netbanking preferred and return only the verified payment result.'],
  };
  const [title, text] = copy[paymentMethod] || copy.upi;

  return (
    <div className="rounded-2xl border border-[#1F2937] bg-[#030712] p-2">
      <div className="flex items-start gap-2">
        <ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#00E599]" />
        <div>
          <p className="text-xs font-black">{title}</p>
          <p className="mt-0.5 text-[10px] leading-4 text-[#9CA3AF]">{text}</p>
        </div>
      </div>
    </div>
  );
}

function PaymentSetupNotice({ message }) {
  return (
    <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3">
      <div className="flex items-start gap-2">
        <ShieldCheck size={15} className="mt-0.5 shrink-0 text-amber-300" />
        <div>
          <p className="text-sm font-black text-amber-100">Razorpay setup required</p>
          <p className="mt-1 text-xs leading-5 text-amber-100/80">
            {message || 'Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to backend/.env, then restart the backend.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function TopNav({ user, subscription, notifications = [], search, setSearch, onSearch, onCommand, onNavigate, onLogout, theme, setTheme }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`extensio-read-notifications:${user?._id || user?.email || 'guest'}`) || '[]');
    } catch {
      return [];
    }
  });
  const [profileOpen, setProfileOpen] = useState(false);
  const notificationsRef = useRef(null);
  const isLight = theme === 'light';
  const notificationStorageKey = `extensio-read-notifications:${user?._id || user?.email || 'guest'}`;
  const readSet = useMemo(() => new Set(readNotificationIds), [readNotificationIds]);
  const unreadCount = notifications.filter(item => !readSet.has(item.id)).length;

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(notificationStorageKey) || '[]');
      setReadNotificationIds(Array.isArray(saved) ? saved : []);
    } catch {
      setReadNotificationIds([]);
    }
  }, [notificationStorageKey]);

  useEffect(() => {
    localStorage.setItem(notificationStorageKey, JSON.stringify(readNotificationIds));
  }, [notificationStorageKey, readNotificationIds]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!notificationsRef.current?.contains(event.target)) {
        setNotificationsOpen(false);
      }
    }

    if (notificationsOpen) document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [notificationsOpen]);

  function goTo(page) {
    onNavigate?.(page);
    setNotificationsOpen(false);
    setProfileOpen(false);
  }

  function toggleNotifications() {
    setNotificationsOpen(value => !value);
    setProfileOpen(false);
  }

  function markAllNotificationsRead() {
    setReadNotificationIds(current => Array.from(new Set([...current, ...notifications.map(item => item.id)])));
  }

  function openNotification(item) {
    setReadNotificationIds(current => Array.from(new Set([...current, item.id])));
    goTo(item.page);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[#1F2937] bg-[#030712]/85 px-4 py-3 backdrop-blur-xl lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <button onClick={onCommand} className="hidden items-center gap-2 rounded-xl border border-[#1F2937] bg-[#111827] px-3 py-2 text-sm font-bold text-[#9CA3AF] hover:text-[#F9FAFB] md:flex">
          <Command size={16} /> Ctrl K
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[#1F2937] bg-[#111827] px-3 py-2">
          <Search size={16} className="text-[#9CA3AF]" />
          <input value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => event.key === 'Enter' && onSearch()} placeholder="Search extensions, prompts, files..." className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#6B7280]" />
        </div>
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={toggleNotifications}
            className="relative rounded-xl border border-[#1F2937] bg-[#111827] p-2 text-[#9CA3AF] transition hover:border-[#00E599]/50 hover:text-[#00E599]"
            aria-label="Open notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">{unreadCount}</span>}
          </button>
          <AnimatePresence>
            {notificationsOpen && (
              <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} className="absolute right-0 mt-3 w-80 rounded-2xl border border-[#1F2937] bg-[#111827] p-3 shadow-2xl shadow-black/40">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black">Notifications</p>
                  <div className="flex items-center gap-3">
                    {unreadCount > 0 && <button type="button" onClick={markAllNotificationsRead} className="text-xs font-bold text-[#00E599]">Mark read</button>}
                    <button type="button" onClick={() => setNotificationsOpen(false)} className="text-xs font-bold text-[#9CA3AF] hover:text-[#00E599]">Close</button>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {notifications.length ? notifications.map(item => {
                    const unread = !readSet.has(item.id);
                    return (
                    <button key={item.id} type="button" onClick={() => openNotification(item)} className={clsx('w-full rounded-xl border px-3 py-2 text-left transition hover:border-[#00E599]/50', unread ? 'border-[#00E599]/40 bg-[#00E599]/10' : 'border-[#1F2937] bg-[#030712]')}>
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 text-sm font-black capitalize">{item.title}</p>
                        {unread && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#00E599]" aria-label="Unread notification" />}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-[#9CA3AF]">{item.description}</p>
                      {item.createdAt && <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#6B7280]">{new Date(item.createdAt).toLocaleString()}</p>}
                    </button>
                  );}) : (
                    <p className="rounded-xl border border-dashed border-[#1F2937] px-3 py-4 text-center text-xs leading-5 text-[#9CA3AF]">No notifications yet. New generations and payment updates will appear here.</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          type="button"
          onClick={() => setTheme(current => current === 'dark' ? 'light' : 'dark')}
          className="rounded-xl border border-[#1F2937] bg-[#111827] p-2 text-[#9CA3AF] transition hover:border-[#00E599]/50 hover:text-[#00E599]"
          title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
          aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {isLight ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <span className="rounded-full bg-[#00E599]/10 px-3 py-2 text-xs font-black uppercase text-[#00E599]">{subscription?.plan || 'free'}</span>
        <div className="relative">
          <button
            type="button"
            onClick={() => { setProfileOpen(value => !value); setNotificationsOpen(false); }}
            className="grid h-10 w-10 place-items-center rounded-xl premium-gradient font-black text-[#030712] transition hover:scale-105"
            aria-label="Open profile menu"
          >
            {user?.name?.[0] || 'U'}
          </button>
          <AnimatePresence>
            {profileOpen && (
              <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} className="absolute right-0 mt-3 w-72 rounded-2xl border border-[#1F2937] bg-[#111827] p-3 shadow-2xl shadow-black/40">
                <div className="flex items-center gap-3 rounded-xl bg-[#030712] p-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#00E599]/10 text-[#00E599]"><UserCircle size={22} /></span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">{user?.name || 'User'}</p>
                    <p className="truncate text-xs text-[#9CA3AF]">{user?.email || 'Signed in'}</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2">
                  <button type="button" onClick={() => goTo('Settings')} className="rounded-xl border border-[#1F2937] px-3 py-2 text-left text-sm font-bold transition hover:border-[#00E599]/50 hover:text-[#00E599]">Profile settings</button>
                  <button type="button" onClick={() => goTo('Billing')} className="rounded-xl border border-[#1F2937] px-3 py-2 text-left text-sm font-bold transition hover:border-[#00E599]/50 hover:text-[#00E599]">Billing and plan</button>
                  <button type="button" onClick={onLogout} className="rounded-xl border border-red-400/30 px-3 py-2 text-left text-sm font-black text-red-200 transition hover:bg-red-500/10">Logout</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-2 rounded-xl border border-[#1F2937] bg-[#111827] px-3 py-2 text-sm font-black text-[#F9FAFB] transition hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-200"
          title="Log out"
        >
          <LogOut size={16} />
          <span className="hidden xl:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}

function HeroDashboard() {
  return (
    <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="glass-panel overflow-hidden rounded-3xl p-6 lg:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#00E599]">AI Extension Factory</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight lg:text-5xl">Generate, validate, and ship Chrome extensions from a prompt.</h1>
          <p className="mt-4 max-w-2xl text-[#9CA3AF]">A premium workspace for no-code extension creation, version history, secure packaging, and instant ZIP delivery.</p>
        </div>
        <div className="rounded-2xl border border-[#1F2937] bg-[#030712] p-4 font-mono text-sm text-[#9CA3AF]">
          <p>&gt; Build Chrome Extensions With AI</p>
          <p className="mt-2 text-[#00E599]">manifest.json + content.js + popup.html + ZIP</p>
        </div>
      </div>
    </motion.section>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4 }} className="glass-panel rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#00E599]/10 text-[#00E599]"><Icon size={20} /></span>
        <span className="rounded-full bg-[#111827] px-3 py-1 text-xs font-bold text-[#9CA3AF]">Live</span>
      </div>
      <p className="mt-5 text-3xl font-black">{value}</p>
      <p className="mt-1 text-sm text-[#9CA3AF]">{label}</p>
    </motion.div>
  );
}

function PromptWorkspace({ prompt, setPrompt, generate, loading }) {
  return (
    <section className="glass-panel rounded-2xl p-5">
      <div className="flex items-center gap-2">
        <WandSparkles size={20} className="text-[#00E599]" />
        <h2 className="font-black">AI Prompt Workspace</h2>
      </div>
      <form onSubmit={generate} className="mt-4 space-y-4">
        <div className="rounded-2xl border border-[#1F2937] bg-[#030712] p-4">
          <textarea value={prompt} onChange={event => setPrompt(event.target.value)} rows={7} className="w-full resize-none bg-transparent text-sm leading-7 outline-none placeholder:text-[#6B7280]" />
          <div className="mt-3 flex items-center justify-between border-t border-[#1F2937] pt-3 text-xs text-[#9CA3AF]">
            <span>{prompt.length}/4000 characters</span>
            <span>Manifest V3 ready</span>
          </div>
        </div>
        <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl premium-gradient px-4 py-3 font-black text-[#030712] disabled:opacity-60">
          <Sparkles size={18} /> {loading ? 'Generating...' : 'Generate ZIP'}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {promptSuggestions.map(suggestion => (
          <button key={suggestion} onClick={() => setPrompt(suggestion)} className="rounded-full border border-[#1F2937] px-3 py-2 text-xs font-semibold text-[#9CA3AF] hover:border-[#00E599]/50 hover:text-[#F9FAFB]">
            {suggestion}
          </button>
        ))}
      </div>
    </section>
  );
}

function GenerationProgress({ loading, progressStep }) {
  return (
    <AnimatePresence>
      {loading && (
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 animate-pulse rounded-full bg-[#00E599]" />
            <h3 className="font-black">AI Thinking</h3>
          </div>
          <div className="mt-4 space-y-3">
            {generationSteps.map((step, index) => (
              <div key={step} className="flex items-center gap-3 text-sm">
                <span className={clsx('h-2 w-2 rounded-full', index <= progressStep ? 'bg-[#00E599]' : 'bg-[#374151]')} />
                <span className={index <= progressStep ? 'text-[#F9FAFB]' : 'text-[#6B7280]'}>{step}</span>
              </div>
            ))}
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

function SearchAndHistory({ extensions, selectedId, setSelectedId, removeExtension, duplicateExtension }) {
  return (
    <section id="my-extensions" className="glass-panel rounded-2xl p-5">
      <SectionHeader eyebrow="History" title="My Extensions" />
      <div className="mt-4 space-y-3">
        {extensions.map(item => (
          <motion.button key={item._id} whileHover={{ scale: 1.01 }} onClick={() => setSelectedId(item._id)} className={clsx('w-full rounded-2xl border p-4 text-left transition', selectedId === item._id ? 'border-[#00E599] bg-[#00E599]/10' : 'border-[#1F2937] bg-[#030712] hover:border-[#00E599]/40')}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-[#F9FAFB]">{item.name}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#9CA3AF]">{item.prompt}</p>
              </div>
              <Trash2 onClick={(event) => { event.stopPropagation(); removeExtension(item._id); }} size={17} className="text-[#6B7280] hover:text-red-400" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-[#9CA3AF]">
              <span className="rounded-full bg-[#111827] px-2 py-1">v{item.versionHistory?.length || 1}</span>
              <span className="rounded-full bg-[#111827] px-2 py-1">Download</span>
              <span onClick={(event) => { event.stopPropagation(); duplicateExtension(item._id); }} className="rounded-full bg-[#111827] px-2 py-1 hover:bg-[#00E599]/10 hover:text-[#00E599]">Duplicate</span>
            </div>
          </motion.button>
        ))}
        {!extensions.length && <EmptyState />}
      </div>
    </section>
  );
}

function SelectedExtension({ selected, editPrompt, setEditPrompt, edit, loading }) {
  return (
    <section id="history" className="glass-panel rounded-2xl p-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#00E599]">Extension History</p>
          <h2 className="mt-2 text-3xl font-black">{selected?.name || 'Generate your first extension'}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#9CA3AF]">{selected?.description || 'Your generated extension details, files, versions, and download actions will appear here.'}</p>
        </div>
        {selected?.zipUrl && (
          <a href={downloadUrl(selected.zipUrl)} className="inline-flex items-center justify-center gap-2 rounded-xl premium-gradient px-5 py-3 font-black text-[#030712]">
            <Download size={18} /> Download Extension
          </a>
        )}
      </div>

      {selected && (
        <form onSubmit={edit} className="mt-5 flex flex-col gap-3 lg:flex-row">
          <input value={editPrompt} onChange={event => setEditPrompt(event.target.value)} placeholder="Edit request, e.g. change red boxes to blue circles" className="min-w-0 flex-1 rounded-xl border border-[#1F2937] bg-[#030712] px-4 py-3 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#00E599]/60" />
          <button disabled={loading || !editPrompt} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F9FAFB] px-5 py-3 font-black text-[#030712] disabled:opacity-50">
            <Send size={17} /> Apply Edit
          </button>
        </form>
      )}
    </section>
  );
}

function getWeekKey(date) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
}

function formatDailyUsage(dailyUsage) {
  if (!dailyUsage) return '0/5';
  if (dailyUsage.limit === null || dailyUsage.limit === undefined) return `${dailyUsage.used || 0}`;
  return `${dailyUsage.used || 0}/${dailyUsage.limit}`;
}

function buildAnalyticsData(extensions, payments) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return { date, day: getWeekKey(date), generations: 0, downloads: 0, payments: 0 };
  });
  const sameDay = (left, right) => left.toDateString() === right.toDateString();

  extensions.forEach(item => {
    const created = item.createdAt ? new Date(item.createdAt) : null;
    const target = created && days.find(day => sameDay(day.date, created));
    if (target) {
      target.generations += 1;
      target.downloads += Math.max(1, item.versionHistory?.length || 1);
    }

    (item.versionHistory || []).forEach(version => {
      const versionDate = version.createdAt ? new Date(version.createdAt) : null;
      const versionTarget = versionDate && days.find(day => sameDay(day.date, versionDate));
      if (versionTarget && version.editRequest) versionTarget.generations += 1;
    });
  });

  payments.forEach(payment => {
    const created = payment.createdAt ? new Date(payment.createdAt) : null;
    const target = created && days.find(day => sameDay(day.date, created));
    if (target && payment.status === 'paid') target.payments += 1;
  });

  return days.map(({ date, ...item }) => item);
}

function AnalyticsSummary({ extensions, payments, storageKb, subscription, dailyUsage }) {
  const paidPayments = payments.filter(payment => payment.status === 'paid');
  const totalVersions = extensions.reduce((sum, item) => sum + Math.max(1, item.versionHistory?.length || 1), 0);
  const stats = [
    ['Extensions', extensions.length, Boxes],
    ['Used Today', formatDailyUsage(dailyUsage), Activity],
    ['Version Events', totalVersions, Activity],
    ['Paid Receipts', paidPayments.length, Receipt],
    ['Storage Used', `${storageKb} KB`, FileArchive],
    ['Plan', (subscription?.plan || 'free').toUpperCase(), Zap],
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      {stats.map(([label, value, Icon]) => (
        <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#00E599]/10 text-[#00E599]"><Icon size={18} /></span>
            <span className="rounded-full bg-[#111827] px-2 py-1 text-[10px] font-black uppercase text-[#9CA3AF]">Live</span>
          </div>
          <p className="mt-4 text-2xl font-black">{value}</p>
          <p className="mt-1 text-xs font-bold text-[#9CA3AF]">{label}</p>
        </motion.div>
      ))}
    </section>
  );
}

function AnalyticsPanel({ extensions, payments }) {
  const data = useMemo(() => buildAnalyticsData(extensions, payments), [extensions, payments]);
  const hasData = data.some(item => item.generations || item.downloads || item.payments);

  return (
    <section className="glass-panel rounded-2xl p-5">
      <SectionHeader eyebrow="Analytics" title="Usage statistics" />
      <div className="mt-5 h-72">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="gen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00E599" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#00E599" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="dl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#38BDF8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1F2937" strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke="#9CA3AF" />
              <YAxis allowDecimals={false} stroke="#9CA3AF" />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 14, color: '#F9FAFB' }} />
              <Area type="monotone" dataKey="downloads" name="Download actions" stroke="#38BDF8" fill="url(#dl)" strokeWidth={2} />
              <Area type="monotone" dataKey="generations" name="Generations and edits" stroke="#00E599" fill="url(#gen)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="grid h-full place-items-center rounded-2xl border border-dashed border-[#1F2937] bg-[#030712] text-center">
            <div>
              <Activity className="mx-auto text-[#00E599]" size={28} />
              <p className="mt-3 font-black">No analytics yet</p>
              <p className="mt-1 text-sm text-[#9CA3AF]">Generate or edit an extension to start tracking real usage.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ActivityFeed({ extensions, payments = [], activityItems = [] }) {
  const recordedEvents = activityItems.map(item => ({
    id: item._id,
    title: item.title,
    description: item.description,
    createdAt: item.createdAt,
    icon: activityIconForType(item.type),
  }));
  const extensionEvents = extensions.flatMap(item => {
    const events = [{
      id: `${item._id}-created`,
      title: item.name,
      description: 'Extension generated and saved',
      createdAt: item.createdAt || item.updatedAt,
      icon: Boxes,
    }];
    (item.versionHistory || []).filter(version => version.editRequest).forEach(version => {
      events.push({
        id: `${item._id}-${version.version}`,
        title: `${item.name} v${version.version}`,
        description: version.prompt || 'Prompt edit applied',
        createdAt: version.createdAt,
        icon: History,
      });
    });
    return events;
  });
  const paymentEvents = payments.map(payment => ({
    id: payment._id,
    title: `${payment.plan} payment ${payment.status}`,
    description: `₹${payment.amount?.toLocaleString('en-IN') || 0} via ${payment.paymentMethod}`,
    createdAt: payment.createdAt,
    icon: Receipt,
  }));
  const fallbackEvents = [...paymentEvents, ...extensionEvents]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 8);
  const events = recordedEvents.length ? recordedEvents : fallbackEvents;

  return (
    <section className="glass-panel rounded-2xl p-5">
      <SectionHeader eyebrow="Activity" title="Recent activity" />
      <div className="mt-5 space-y-3">
        {(events.length ? events : [{ id: 'empty', title: 'No activity yet', description: 'Generate an extension to start your feed.', icon: Activity }]).map(item => {
          const Icon = item.icon || Activity;
          return (
          <div key={item.id} className="flex gap-3 rounded-xl border border-[#1F2937] bg-[#030712] p-3">
            <Icon size={18} className="mt-1 text-[#00E599]" />
            <div>
              <p className="text-sm font-black capitalize">{item.title}</p>
              <p className="mt-1 text-xs leading-5 text-[#9CA3AF]">{item.description}</p>
              {item.createdAt && <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#6B7280]">{new Date(item.createdAt).toLocaleString()}</p>}
            </div>
          </div>
        );})}
      </div>
    </section>
  );
}

function activityIconForType(type) {
  if (type?.startsWith('subscription.')) return Receipt;
  if (type === 'extension.scanned') return ShieldCheck;
  if (type === 'extension.deleted') return Trash2;
  if (type === 'extension.edited') return History;
  if (type === 'extension.duplicated') return Copy;
  if (type === 'extension.generated') return Boxes;
  return Activity;
}

function SettingsControls({ paymentConfig, theme, setTheme, setActivePage }) {
  const providers = [
    ['Groq AI', 'Connected through GROQ_API_KEY in backend/.env', 'Env managed'],
    ['Gemini AI', 'Optional fallback through GEMINI_API_KEY', 'Optional'],
    ['Razorpay', paymentConfig?.configured ? 'Checkout keys are configured' : paymentConfig?.message || 'Payment keys are not configured', paymentConfig?.configured ? 'Ready' : 'Needs setup'],
    ['OAuth', 'Google/GitHub/Microsoft require client credentials', 'Configurable'],
  ];

  async function copyEnvTemplate() {
    const template = [
      'GROQ_API_KEY=',
      'GEMINI_API_KEY=',
      'RAZORPAY_KEY_ID=',
      'RAZORPAY_KEY_SECRET=',
      'RAZORPAY_WEBHOOK_SECRET=',
      'GOOGLE_CLIENT_ID=',
      'GOOGLE_CLIENT_SECRET=',
    ].join('\n');

    try {
      await navigator.clipboard.writeText(template);
      toast.success('Environment template copied');
    } catch {
      toast.error('Clipboard blocked. Open backend/.env.example to copy the keys.');
    }
  }

  return (
    <div className="grid gap-6">
      <motion.div whileHover={{ y: -4 }} className="glass-panel rounded-2xl p-5">
        <Settings className="text-[#00E599]" size={20} />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-black">API Key Management</h3>
            <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">Track provider readiness and jump to payment setup when keys are missing.</p>
          </div>
          <button type="button" onClick={copyEnvTemplate} className="rounded-xl border border-[#1F2937] px-3 py-2 text-xs font-black transition hover:border-[#00E599]/60 hover:text-[#00E599]">
            Copy env keys
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {providers.map(([name, description, status]) => (
            <div key={name} className="rounded-xl border border-[#1F2937] bg-[#030712] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black">{name}</p>
                <span className={clsx('rounded-full px-2 py-1 text-[10px] font-black uppercase', status === 'Ready' || status === 'Env managed' ? 'bg-[#00E599]/10 text-[#00E599]' : 'bg-amber-500/10 text-amber-300')}>{status}</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-[#9CA3AF]">{description}</p>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setActivePage('Billing')} className="mt-4 w-full rounded-xl premium-gradient px-4 py-3 font-black text-[#030712]">
          Open payment setup
        </button>
      </motion.div>

      <motion.div whileHover={{ y: -4 }} className="glass-panel rounded-2xl p-5">
        <Settings className="text-[#00E599]" size={20} />
        <h3 className="mt-4 font-black">Theme Settings</h3>
        <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">Switch workspace appearance instantly. Your choice is saved on this browser.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            ['dark', 'Dark workspace', Moon],
            ['light', 'Light workspace', Sun],
          ].map(([mode, label, Icon]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setTheme(mode)}
              className={clsx('rounded-2xl border p-4 text-left transition', theme === mode ? 'border-[#00E599] bg-[#00E599]/10' : 'border-[#1F2937] bg-[#030712] hover:border-[#00E599]/50')}
            >
              <Icon size={20} className="text-[#00E599]" />
              <p className="mt-3 text-sm font-black">{label}</p>
              <p className="mt-1 text-xs text-[#9CA3AF]">{theme === mode ? 'Active now' : 'Click to activate'}</p>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function ProfileSettings({ user, updateProfile }) {
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const toastId = toast.loading('Saving profile...');
    try {
      await updateProfile({
        name: form.get('name'),
        email: form.get('email'),
      });
      toast.success('Profile updated', { id: toastId });
    } catch (error) {
      toast.error(error.message, { id: toastId });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="glass-panel rounded-2xl p-5">
      <SectionHeader eyebrow="Profile" title="Account details" />
      <form key={user?._id || user?.email || 'profile'} onSubmit={handleSubmit} className="mt-5 space-y-4">
        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.18em] text-[#9CA3AF]">Name</span>
          <input name="name" defaultValue={user?.name || ''} className="mt-2 w-full rounded-xl border border-[#1F2937] bg-[#030712] px-4 py-3 outline-none focus:border-[#00E599]/60" />
        </label>
        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.18em] text-[#9CA3AF]">Email</span>
          <input name="email" type="email" defaultValue={user?.email || ''} className="mt-2 w-full rounded-xl border border-[#1F2937] bg-[#030712] px-4 py-3 outline-none focus:border-[#00E599]/60" />
        </label>
        <button disabled={saving} className="rounded-xl premium-gradient px-5 py-3 font-black text-[#030712] disabled:opacity-60">
          {saving ? 'Saving...' : 'Save profile'}
        </button>
      </form>
    </section>
  );
}

function CommandPalette({ open, onClose, setPrompt, setActivePage }) {
  const [query, setQuery] = useState('');
  const fileInputRef = useRef(null);

  const actions = useMemo(() => [
    ...promptSuggestions.map(suggestion => ({
      id: suggestion,
      label: suggestion,
      description: 'Use this prompt template',
      Icon: Sparkles,
      run: () => {
        setPrompt(suggestion);
        setActivePage('New Extension');
        onClose();
      },
    })),
    {
      id: 'new-extension',
      label: 'Open New Extension',
      description: 'Go to the prompt workspace',
      Icon: Plus,
      run: () => {
        setActivePage('New Extension');
        onClose();
      },
    },
    {
      id: 'my-extensions',
      label: 'Open My Extensions',
      description: 'Manage generated extension ZIPs',
      Icon: Boxes,
      run: () => {
        setActivePage('My Extensions');
        onClose();
      },
    },
    {
      id: 'analytics',
      label: 'Open Analytics',
      description: 'View usage and activity',
      Icon: BarChart3,
      run: () => {
        setActivePage('Analytics');
        onClose();
      },
    },
    {
      id: 'billing',
      label: 'View Billing Plans',
      description: 'Upgrade plans and payment settings',
      Icon: CreditCard,
      run: () => {
        setActivePage('Billing');
        onClose();
      },
    },
    {
      id: 'settings',
      label: 'Open Settings',
      description: 'Manage profile and workspace controls',
      Icon: Settings,
      run: () => {
        setActivePage('Settings');
        onClose();
      },
    },
    {
      id: 'import-prompt',
      label: 'Import Prompt File',
      description: 'Load a .txt or .md prompt into the generator',
      Icon: Upload,
      run: () => fileInputRef.current?.click(),
    },
  ], [onClose, setActivePage, setPrompt]);

  const filteredActions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return actions;
    return actions.filter(action => `${action.label} ${action.description}`.toLowerCase().includes(normalized));
  }, [actions, query]);

  async function handlePromptImport(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const promptText = text.trim();
      if (!promptText) {
        toast.error('Prompt file is empty');
        return;
      }
      setPrompt(promptText.slice(0, 4000));
      setActivePage('New Extension');
      toast.success('Prompt imported');
      onClose();
    } catch (error) {
      toast.error(error?.message || 'Could not import prompt file');
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
          <motion.div initial={{ y: -20, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: -20, scale: 0.98 }} className="mx-auto mt-20 max-w-2xl rounded-2xl border border-[#1F2937] bg-[#030712] p-4 shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-[#1F2937] pb-3">
              <Command size={18} className="text-[#00E599]" />
              <input value={query} onChange={event => setQuery(event.target.value)} autoFocus placeholder="Search commands, templates, shortcuts..." className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#6B7280]" />
            </div>
            <input ref={fileInputRef} type="file" accept=".txt,.md,text/plain,text/markdown" className="hidden" onChange={handlePromptImport} />
            <div className="mt-3 space-y-2">
              {filteredActions.length ? filteredActions.map(({ id, label, description, Icon, run }) => (
                <button key={id} type="button" onClick={run} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-[#D1D5DB] hover:bg-[#111827]">
                  <Icon size={16} className="shrink-0 text-[#00E599]" />
                  <span className="min-w-0">
                    <span className="block truncate">{label}</span>
                    <span className="block truncate text-xs font-medium text-[#6B7280]">{description}</span>
                  </span>
                </button>
              )) : (
                <p className="rounded-xl border border-dashed border-[#1F2937] px-3 py-4 text-center text-sm text-[#9CA3AF]">No matching command found.</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SectionHeader({ eyebrow, title, compact = false }) {
  return (
    <div>
      <p className={clsx('font-black uppercase tracking-[0.22em] text-[#00E599]', compact ? 'text-[10px]' : 'text-xs')}>{eyebrow}</p>
      <h2 className={clsx('font-black text-[#F9FAFB]', compact ? 'mt-0.5 text-base' : 'mt-1 text-xl')}>{title}</h2>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-[#1F2937] bg-[#030712] p-6 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#00E599]/10 text-[#00E599]">
        <Boxes size={24} />
      </div>
      <h3 className="mt-4 font-black">No extensions generated yet</h3>
      <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">Use the prompt workspace to create your first downloadable Manifest V3 extension.</p>
    </div>
  );
}

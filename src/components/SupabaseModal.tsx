import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertCircle, Copy, Check, ExternalLink, X, RefreshCw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose }) => {
  const { language, isRTL } = useLanguage();
  const [status, setStatus] = useState<{ isConfigured: boolean; mode: string; url: string | null } | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isLoadingTest, setIsLoadingTest] = useState(false);
  const [schemaSql, setSchemaSql] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Fetch Supabase status
      fetch('/api/supabase/status')
        .then((res) => res.json())
        .then((data) => setStatus(data))
        .catch((err) => console.error('Failed to load Supabase status:', err));

      // Fetch Schema SQL
      fetch('/api/supabase/schema')
        .then((res) => res.text())
        .then((sql) => setSchemaSql(sql))
        .catch((err) => console.error('Failed to load schema SQL:', err));
    }
  }, [isOpen]);

  const handleTestConnection = async () => {
    setIsLoadingTest(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/supabase/test', { method: 'POST' });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ success: false, message: `Erreur : ${err.message}` });
    } finally {
      setIsLoadingTest(false);
    }
  };

  const handleCopySql = () => {
    if (!schemaSql) return;
    navigator.clipboard.writeText(schemaSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Database className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                {language === 'ar' ? 'إعدادات قاعدة بيانات Supabase SQL' : 'Configuration Supabase SQL'}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'ar' ? 'PostgreSQL علائقي سحابي مدار' : 'PostgreSQL relationnel managé dans le Cloud'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-sm text-slate-700">
          {/* Status Box */}
          <div className={`p-4 rounded-xl border ${
            status?.isConfigured
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-amber-50 border-amber-200 text-amber-950'
          }`}>
            <div className="flex items-start gap-3">
              {status?.isConfigured ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-semibold text-sm">
                  {status?.isConfigured
                    ? (language === 'ar' ? 'اتصال Supabase نشط' : 'Connexion Supabase active')
                    : (language === 'ar' ? 'جاهز لـ Supabase (الوضع المحلي نشط)' : 'Prêt pour Supabase (Mode local actif)')}
                </p>
                <p className="text-xs mt-1 text-slate-600">
                  {status?.isConfigured
                    ? `${language === 'ar' ? 'متصل بقاعدة Supabase :' : "Connecté à l'instance Supabase :"} ${status.url}`
                    : (language === 'ar'
                      ? 'مفاتيح SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY (أو SUPABASE_ANON_KEY) غير محددة بعد في أسرار البيئة. التطبيق يعمل حالياً بمحرك SQLite المحلي المدمج.'
                      : 'Les clés SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_ANON_KEY) n’ont pas encore été renseignées dans les secrets de l’environnement. Le prototype fonctionne actuellement avec son moteur SQLite intégré.')}
                </p>
                {status?.isConfigured && (
                  <button
                    onClick={handleTestConnection}
                    disabled={isLoadingTest}
                    className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTest ? 'animate-spin' : ''}`} />
                    <span>{language === 'ar' ? 'فحص جداول Supabase' : 'Tester les tables Supabase'}</span>
                  </button>
                )}
              </div>
            </div>

            {testResult && (
              <div className={`mt-3 p-2.5 rounded-lg text-xs border ${
                testResult.success ? 'bg-emerald-100 border-emerald-300 text-emerald-900' : 'bg-rose-100 border-rose-300 text-rose-900'
              }`}>
                {testResult.message}
              </div>
            )}
          </div>

          {/* Guide d'installation rapide */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider">
              {language === 'ar' ? '3 خطوات لربط حساب Supabase الخاص بك' : '3 Étapes pour connecter votre compte Supabase'}
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <li>
                <span className="font-medium text-slate-900">
                  {language === 'ar' ? 'أنشئ أو افتح' : 'Créez ou ouvrez'}
                </span>{' '}
                {language === 'ar' ? 'مشروعك على' : 'votre projet sur'}{' '}
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 underline font-medium inline-flex items-center gap-0.5"
                >
                  supabase.com <ExternalLink className="w-2.5 h-2.5" />
                </a>.
              </li>
              <li>
                <span className="font-medium text-slate-900">
                  {language === 'ar' ? 'قم بتنفيذ كود SQL أدناه' : 'Exécutez le script SQL ci-dessous'}
                </span>{' '}
                {language === 'ar'
                  ? 'في محرر SQL Editor في Supabase لإنشاء الجداول الـ 5 والمؤشرات.'
                  : 'dans le SQL Editor de Supabase pour créer les 5 tables, contraintes, RLS et index.'}
              </li>
              <li>
                <span className="font-medium text-slate-900">
                  {language === 'ar' ? 'أضف المتغيرات' : 'Configurez vos variables'}
                </span>{' '}
                <code>SUPABASE_URL</code> {language === 'ar' ? 'و' : 'et'} <code>SUPABASE_SERVICE_ROLE_KEY</code>{' '}
                {language === 'ar'
                  ? 'في إعدادات أسرار البيئة Settings > Secrets.'
                  : 'dans le menu Settings > Secrets de Google AI Studio.'}
              </li>
            </ol>
          </div>

          {/* Schéma SQL */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-slate-900">
                {language === 'ar' ? 'ملف SQL لقاعدة البيانات (schema.sql)' : 'Script SQL pour Supabase (schema.sql)'}
              </span>
              <button
                onClick={handleCopySql}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{language === 'ar' ? 'تم النسخ !' : 'Copié !'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'نسخ كود SQL' : 'Copier le SQL'}</span>
                  </>
                )}
              </button>
            </div>
            <pre dir="ltr" className="p-3 bg-slate-950 text-emerald-400 rounded-xl text-[11px] font-mono max-h-48 overflow-y-auto leading-relaxed border border-slate-800 text-left">
              {schemaSql || '-- Chargement du schéma SQL...'}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition"
          >
            {language === 'ar' ? 'إغلاق' : 'Fermer'}
          </button>
        </div>
      </div>
    </div>
  );
};

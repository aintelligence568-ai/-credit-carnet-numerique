import React from 'react';
import { X, CheckCircle2, RotateCcw, Play } from 'lucide-react';
import { ActiveTab } from './Navigation';
import { useLanguage } from '../context/LanguageContext';

interface TestScenarioGuideModalProps {
  onClose: () => void;
  onSelectClient: (clientId: string) => void;
  onOpenNewCreditForClient: (clientId: string) => void;
  onSelectTab: (tab: ActiveTab) => void;
  onResetData: () => void;
}

export const TestScenarioGuideModal: React.FC<TestScenarioGuideModalProps> = ({
  onClose,
  onSelectClient,
  onOpenNewCreditForClient,
  onSelectTab,
  onResetData,
}) => {
  const { language, isRTL } = useLanguage();

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        id="modal-test-scenarios"
        className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
      >
        <div className="bg-slate-900 text-white p-4 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                {language === 'ar' ? 'دليل سيناريوهات الاختبار الـ 6' : 'Guide des 6 Scénarios de Test'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {language === 'ar' ? 'تحققات مباشرة عند الشباك' : 'Vérifications directes au comptoir'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto flex-1 text-xs">
          {/* Scenario 1 */}
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">
                {language === 'ar' ? 'السيناريو 1 — مامادو ديالو' : 'SCÉNARIO 1 — Mamadou Diallo'}
              </span>
              <button
                onClick={() => {
                  onClose();
                  onSelectClient('client-1');
                }}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1"
              >
                <Play className={`w-3 h-3 ${isRTL ? 'rotate-180' : ''}`} />
                <span>{language === 'ar' ? 'اختبار' : 'Tester'}</span>
              </button>
            </div>
            <p className="text-slate-600">
              {language === 'ar'
                ? 'فتح بطاقة مامادو (الرصيد 25 000 FCFA). تسجيل سداد بمبلغ 10 000 FCFA. التحقق من أن الرصيد الجديد هو 15 000 FCFA.'
                : 'Ouvrir Mamadou (Solde 25 000 FCFA). Enregistrer un paiement de 10 000 FCFA. Vérifier que le nouveau solde est de 15 000 FCFA.'}
            </p>
          </div>

          {/* Scenario 2 */}
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">
                {language === 'ar' ? 'السيناريو 2 — موسى با (محظور)' : 'SCÉNARIO 2 — Moussa Ba (Bloqué)'}
              </span>
              <button
                onClick={() => {
                  onClose();
                  onSelectClient('client-3');
                }}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1"
              >
                <Play className={`w-3 h-3 ${isRTL ? 'rotate-180' : ''}`} />
                <span>{language === 'ar' ? 'اختبار' : 'Tester'}</span>
              </button>
            </div>
            <p className="text-slate-600">
              {language === 'ar'
                ? 'التحقق: 45 000 FCFA ديون (أرز، زيت، سكر)، 10 000 FCFA سداد، و 35 000 FCFA متبقية. الحالة: دين محظور.'
                : 'Vérifier : 45 000 FCFA de crédits (Riz, Huile, Sucre), 10 000 FCFA de paiement, 35 000 FCFA restant. Statut : Crédit bloqué.'}
            </p>
          </div>

          {/* Scenario 3 */}
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">
                {language === 'ar' ? 'السيناريو 3 — عايدة ندياي (دون تكرار)' : 'SCÉNARIO 3 — Aïda Ndiaye (Sans doublon)'}
              </span>
              <button
                onClick={() => {
                  onClose();
                  onOpenNewCreditForClient('client-4');
                }}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1"
              >
                <Play className={`w-3 h-3 ${isRTL ? 'rotate-180' : ''}`} />
                <span>{language === 'ar' ? 'اختبار' : 'Tester'}</span>
              </button>
            </div>
            <p className="text-slate-600">
              {language === 'ar'
                ? 'تسجيل دين جديد لعايدة. التحقق من أنه يضاف إلى ملفها الحالي دون إنشاء بطاقة مكررة ثانية باسم عايدة.'
                : "Créer un nouveau crédit pour Aïda. Vérifier qu'il est ajouté à son profil existant, sans créer de 2e fiche Aïda."}
            </p>
          </div>

          {/* Scenario 4 */}
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">
                {language === 'ar' ? 'السيناريو 4 — فاتو سو (يقترب الأجل)' : 'SCÉNARIO 4 — Fatou Sow (Bientôt à échéance)'}
              </span>
              <button
                onClick={() => {
                  onClose();
                  onSelectClient('client-2');
                }}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1"
              >
                <Play className={`w-3 h-3 ${isRTL ? 'rotate-180' : ''}`} />
                <span>{language === 'ar' ? 'اختبار' : 'Tester'}</span>
              </button>
            </div>
            <p className="text-slate-600">
              {language === 'ar'
                ? 'فتح بطاقة فاتو. التحقق من أن أجل غد يظهر بوضوح مع شارة «يقترب الأجل».'
                : "Ouvrir Fatou. Vérifier que l'échéance de demain apparaît bien avec le badge « Bientôt à échéance »."}
            </p>
          </div>

          {/* Scenario 5 */}
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">
                {language === 'ar' ? 'السيناريو 5 — عثمان فال (مسدد بالكامل)' : 'SCÉNARIO 5 — Ousmane Fall (Soldé)'}
              </span>
              <button
                onClick={() => {
                  onClose();
                  onSelectClient('client-5');
                }}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1"
              >
                <Play className={`w-3 h-3 ${isRTL ? 'rotate-180' : ''}`} />
                <span>{language === 'ar' ? 'اختبار' : 'Tester'}</span>
              </button>
            </div>
            <p className="text-slate-600">
              {language === 'ar'
                ? 'فتح بطاقة عثمان. التحقق من أن رصيده 0 FCFA (الحالة : مسدد بالكامل).'
                : 'Ouvrir Ousmane. Vérifier que son solde est égal à 0 FCFA (Statut : Soldé).'}
            </p>
          </div>

          {/* Scenario 6 */}
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">
                {language === 'ar' ? 'السيناريو 6 — لوحة التحكم الرئيسية' : "SCÉNARIO 6 — Cockpit d'Accueil"}
              </span>
              <button
                onClick={() => {
                  onClose();
                  onSelectTab('accueil');
                }}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1"
              >
                <Play className={`w-3 h-3 ${isRTL ? 'rotate-180' : ''}`} />
                <span>{language === 'ar' ? 'اختبار' : 'Tester'}</span>
              </button>
            </div>
            <p className="text-slate-600">
              {language === 'ar'
                ? 'من شاشة الاستقبال، التعرف الفوري على: الزبائن المتأخرين، الزبائن الواجب تذكيرهم، والمبالغ المستحقة للتحصيل.'
                : "Depuis l'accueil, identifier immédiatement : les clients en retard, les clients à relancer, et les montants à récupérer."}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-2">
          <button
            onClick={() => {
              onResetData();
              alert(language === 'ar' ? 'تمت إعادة تعيين البيانات إلى الزبائن الـ 5 الأوائل.' : 'Données réinitialisées aux 5 clients de départ.');
            }}
            className="flex items-center gap-1 text-xs text-rose-700 hover:text-rose-800 font-semibold px-2 py-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'إعادة ضبط الاختبار' : 'Réinitialiser le test'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
          >
            {language === 'ar' ? 'إغلاق' : 'Fermer'}
          </button>
        </div>
      </div>
    </div>
  );
};

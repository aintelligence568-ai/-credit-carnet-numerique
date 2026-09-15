import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'fr' | 'ar';

export interface Translations {
  // App & Header
  app_title: string;
  app_subtitle: string;
  offline: string;
  install: string;
  supabase_cfg: string;
  scenarios_guide: string;
  reset_test_data: string;
  reset_confirm: string;
  cancel: string;
  close: string;
  confirm: string;
  loading: string;
  edit: string;
  delete: string;

  // Nav
  nav_accueil: string;
  nav_clients: string;
  nav_new_credit: string;
  nav_suivi: string;

  // Status Badges
  status_blocked: string;
  status_overdue: string;
  status_overdue_days: string;
  status_due_today: string;
  status_due_tomorrow: string;
  status_due_soon: string;
  status_settled: string;
  status_up_to_date: string;

  // Accueil (Dashboard)
  kpi_credited_month: string;
  kpi_credited_sub: string;
  kpi_recovered_month: string;
  kpi_recovered_sub: string;
  kpi_remaining_total: string;
  kpi_remaining_sub: string;
  kpi_overdue_count: string;
  kpi_overdue_urgent: string;
  kpi_overdue_none: string;
  kpi_overdue_all_good: string;
  section_priority_reminders: string;
  priority_reminders_count: string;
  total_debt_label: string;
  due_date_label: string;
  action_whatsapp: string;
  action_sms: string;
  action_collect: string;
  action_new_credit: string;
  action_client_sheet: string;
  no_reminders_today: string;
  no_reminders_desc: string;
  section_quick_actions: string;
  quick_action_new_credit_title: string;
  quick_action_new_credit_sub: string;
  quick_action_new_client_title: string;
  quick_action_new_client_sub: string;
  quick_action_scenarios_title: string;
  quick_action_scenarios_sub: string;

  // Clients View
  clients_title: string;
  clients_search_placeholder: string;
  filter_all: string;
  filter_overdue: string;
  filter_due_soon: string;
  filter_up_to_date: string;
  filter_blocked: string;
  filter_settled: string;
  client_due: string;
  client_credits: string;
  client_paid: string;
  client_last_due: string;
  client_no_debt: string;
  no_clients_found: string;
  no_clients_desc: string;
  view_full_sheet: string;
  btn_new_client: string;

  // Suivi View
  suivi_banner_title: string;
  suivi_banner_desc: string;
  suivi_month_situation: string;
  suivi_month_current: string;
  suivi_credits_granted: string;
  suivi_recovered_amounts: string;
  suivi_net_month: string;
  suivi_global_situation: string;
  suivi_total_cumulative_credits: string;
  suivi_total_cumulative_payments: string;
  suivi_total_remaining_due: string;
  suivi_recovery_rate: string;
  suivi_plan_title: string;
  suivi_plan_subtitle: string;
  suivi_cat_overdue: string;
  suivi_cat_due_soon: string;
  suivi_cat_blocked: string;
  suivi_cat_up_to_date: string;
  suivi_no_overdue: string;
  suivi_no_due_soon: string;
  suivi_no_blocked: string;
  suivi_no_debtors: string;

  // Credit Modal
  credit_modal_title: string;
  credit_mode_express: string;
  credit_mode_detailed: string;
  credit_select_client: string;
  credit_choose_client: string;
  credit_quick_new_client: string;
  credit_client_blocked_warning: string;
  credit_client_blocked_desc: string;
  credit_unblock_btn: string;
  credit_express_amount_label: string;
  credit_amount_placeholder: string;
  credit_description_label: string;
  credit_description_placeholder: string;
  credit_due_date_label: string;
  credit_in_3_days: string;
  credit_in_7_days: string;
  credit_in_15_days: string;
  credit_in_30_days: string;
  credit_detailed_items_label: string;
  credit_item_name: string;
  credit_item_qty: string;
  credit_item_price: string;
  credit_add_item: string;
  credit_detailed_total: string;
  credit_submit: string;
  credit_submitting: string;

  // Payment Modal
  payment_modal_title: string;
  payment_counter: string;
  payment_client_label: string;
  payment_current_balance: string;
  payment_amount_label: string;
  payment_amount_placeholder: string;
  payment_full_pay_btn: string;
  payment_notes_label: string;
  payment_notes_default: string;
  payment_notes_placeholder: string;
  payment_new_balance_label: string;
  payment_error_exceeds: string;
  payment_submit: string;
  payment_submitting: string;

  // Client Modal
  client_modal_title: string;
  client_modal_subtitle: string;
  client_first_name: string;
  client_first_name_placeholder: string;
  client_last_name: string;
  client_last_name_placeholder: string;
  client_phone: string;
  client_phone_placeholder: string;
  client_phone_unique_hint: string;
  client_create_btn: string;
  client_creating: string;

  // Client Detail Modal
  client_sheet_title: string;
  client_balance_label: string;
  client_total_credits_label: string;
  client_total_payments_label: string;
  client_btn_credit: string;
  client_btn_payment: string;
  client_btn_whatsapp: string;
  client_btn_sms: string;
  client_block_credit: string;
  client_unblock_credit: string;
  client_blocked_notice: string;
  client_history_title: string;
  client_tab_credits: string;
  client_tab_payments: string;
  client_no_credits: string;
  client_no_payments: string;
  client_due_date: string;
  client_credit_details: string;
  client_items_count: string;

  // Reminder Modal
  reminder_title: string;
  reminder_subtitle: string;
  reminder_channel_whatsapp: string;
  reminder_channel_sms: string;
  reminder_message_label: string;
  reminder_btn_copy: string;
  reminder_copied: string;
  reminder_btn_open_whatsapp: string;
  reminder_btn_open_sms: string;
  reminder_template: (name: string, balanceStr: string) => string;

  // Test Guide & Supabase
  guide_title: string;
  guide_subtitle: string;
  guide_test_btn: string;
  guide_reset_btn: string;
  supabase_title: string;
  supabase_active_badge: string;
  supabase_local_badge: string;
}

export const translations: Record<Language, Translations> = {
  fr: {
    // App & Header
    app_title: 'Carnet de Cheikh',
    app_subtitle: 'Crédits Clients au Comptoir',
    offline: 'Hors-ligne',
    install: 'Installer',
    supabase_cfg: 'Configuration Supabase',
    scenarios_guide: 'Guide des 6 Scénarios de Test',
    reset_test_data: 'Réinitialiser les données de test',
    reset_confirm: 'Réinitialiser toutes les données aux 5 clients de départ ?',
    cancel: 'Annuler',
    close: 'Fermer',
    confirm: 'Confirmer',
    loading: 'Chargement...',
    edit: 'Modifier',
    delete: 'Supprimer',

    // Nav
    nav_accueil: 'Accueil',
    nav_clients: 'Clients',
    nav_new_credit: '+ Crédit',
    nav_suivi: 'Suivi',

    // Status Badges
    status_blocked: 'Crédit bloqué',
    status_overdue: 'En retard',
    status_overdue_days: 'En retard ({days}j)',
    status_due_today: "Échéance aujourd'hui",
    status_due_tomorrow: 'Échéance demain',
    status_due_soon: 'Bientôt à échéance',
    status_settled: 'Soldé (0 FCFA)',
    status_up_to_date: 'À jour',

    // Accueil
    kpi_credited_month: 'Donné à crédit (mois)',
    kpi_credited_sub: 'Ce mois en cours',
    kpi_recovered_month: 'Récupéré (mois)',
    kpi_recovered_sub: 'Paiements reçus',
    kpi_remaining_total: 'Total restant',
    kpi_remaining_sub: 'Dû par tous les clients',
    kpi_overdue_count: 'En retard',
    kpi_overdue_urgent: "À relancer d'urgence",
    kpi_overdue_none: 'Aucun retard actif',
    kpi_overdue_all_good: 'Tous les comptes sont à jour !',
    section_priority_reminders: "Priorité de relance aujourd'hui",
    priority_reminders_count: 'clients ont une échéance dépassée ou imminente',
    total_debt_label: 'Dette totale :',
    due_date_label: 'Échéance :',
    action_whatsapp: 'WhatsApp',
    action_sms: 'SMS',
    action_collect: 'Encaisser',
    action_new_credit: 'Nouveau crédit',
    action_client_sheet: 'Fiche client',
    no_reminders_today: "Aucun client à relancer aujourd'hui !",
    no_reminders_desc: 'Toutes les échéances sont respectées ou les dettes soldées.',
    section_quick_actions: 'Actions Rapides',
    quick_action_new_credit_title: 'Nouveau Crédit',
    quick_action_new_credit_sub: 'Enregistrer un crédit express ou détaillé',
    quick_action_new_client_title: 'Nouveau Client',
    quick_action_new_client_sub: 'Ajouter un client dans le carnet',
    quick_action_scenarios_title: 'Voir les 5 Scénarios de Démo',
    quick_action_scenarios_sub: 'Mamadou, Moussa, Aïda, Fatou, Ousmane',

    // Clients View
    clients_title: 'Répertoire des Clients',
    clients_search_placeholder: 'Rechercher par nom, prénom, téléphone...',
    filter_all: 'Tous',
    filter_overdue: 'En retard',
    filter_due_soon: 'Bientôt',
    filter_up_to_date: 'À jour',
    filter_blocked: 'Bloqués',
    filter_settled: 'Soldés',
    client_due: 'Dû :',
    client_credits: 'Crédits :',
    client_paid: 'Payé :',
    client_last_due: 'Dernière échéance :',
    client_no_debt: 'Aucune dette en cours',
    no_clients_found: 'Aucun client trouvé',
    no_clients_desc: 'Essayez un autre mot-clé ou filtre',
    view_full_sheet: 'Voir la fiche complète',
    btn_new_client: 'Nouveau Client',

    // Suivi View
    suivi_banner_title: 'Suivi des Créances au Comptoir',
    suivi_banner_desc:
      'Vision claire et immédiate pour répondre aux 4 questions clés : Qui me doit ? Combien ? Depuis quand ? Qui relancer ?',
    suivi_month_situation: 'Situation du mois',
    suivi_month_current: 'Mois en cours',
    suivi_credits_granted: 'Crédits accordés',
    suivi_recovered_amounts: 'Montants récupérés',
    suivi_net_month: 'Solde net généré ce mois',
    suivi_global_situation: 'Situation globale',
    suivi_total_cumulative_credits: 'Total cumulé des crédits',
    suivi_total_cumulative_payments: 'Total cumulé des règlements',
    suivi_total_remaining_due: 'Total restant dû (Comptoir)',
    suivi_recovery_rate: 'Taux global de recouvrement :',
    suivi_plan_title: 'Plan de Recouvrement Prioritaire',
    suivi_plan_subtitle: "Clients classés par urgence d'encaissement",
    suivi_cat_overdue: '1. Urgences (En retard)',
    suivi_cat_due_soon: '2. Échéances imminentes',
    suivi_cat_blocked: '3. Clients bloqués',
    suivi_cat_up_to_date: '4. Clients à jour',
    suivi_no_overdue: 'Aucun client en retard !',
    suivi_no_due_soon: 'Aucune échéance dans les 3 prochains jours.',
    suivi_no_blocked: 'Aucun client bloqué actuellement.',
    suivi_no_debtors: 'Tous les clients sont parfaitement à jour ou soldés !',

    // Credit Modal
    credit_modal_title: 'Accorder un Nouveau Crédit',
    credit_mode_express: 'Mode Express',
    credit_mode_detailed: 'Mode Détaillé (Articles)',
    credit_select_client: '1. Client',
    credit_choose_client: 'Choisir un client...',
    credit_quick_new_client: '+ Nouveau client',
    credit_client_blocked_warning: 'Attention : Ce client est actuellement BLOQUÉ',
    credit_client_blocked_desc: 'Selon les règles, aucun nouveau crédit ne doit lui être accordé sans régularisation.',
    credit_unblock_btn: 'Débloquer et autoriser ce crédit',
    credit_express_amount_label: '2. Montant du crédit',
    credit_amount_placeholder: 'Ex : 15000',
    credit_description_label: '3. Description / Motif (optionnel)',
    credit_description_placeholder: 'Ex : Pain, sucre, lait, huile...',
    credit_due_date_label: "4. Date d'échéance",
    credit_in_3_days: '+3 jours',
    credit_in_7_days: '+7 jours',
    credit_in_15_days: '+15 jours',
    credit_in_30_days: '+30 jours',
    credit_detailed_items_label: '2. Articles pris à crédit',
    credit_item_name: "Nom de l'article",
    credit_item_qty: 'Qté',
    credit_item_price: 'Prix total (FCFA)',
    credit_add_item: '+ Ajouter une ligne',
    credit_detailed_total: 'Total des articles :',
    credit_submit: 'Valider le Crédit',
    credit_submitting: 'Enregistrement...',

    // Payment Modal
    payment_modal_title: 'Enregistrer un Paiement',
    payment_counter: 'Comptoir',
    payment_client_label: '1. Client',
    payment_current_balance: 'Solde restant dû :',
    payment_amount_label: '2. Montant payé',
    payment_amount_placeholder: 'Ex : 10000',
    payment_full_pay_btn: 'Tout solder',
    payment_notes_label: '3. Notes / Moyen de paiement',
    payment_notes_default: 'Règlement au comptoir',
    payment_notes_placeholder: 'Ex : Espèces, Wave, Orange Money...',
    payment_new_balance_label: 'Nouveau solde calculé :',
    payment_error_exceeds: 'Le montant payé dépasse le solde restant dû. Le solde ne peut jamais devenir négatif.',
    payment_submit: "Valider l'encaissement",
    payment_submitting: 'Enregistrement...',

    // Client Modal
    client_modal_title: 'Nouveau Client',
    client_modal_subtitle: 'Ajouter un client au carnet de crédit',
    client_first_name: 'Prénom',
    client_first_name_placeholder: 'Ex : Ibrahima',
    client_last_name: 'Nom',
    client_last_name_placeholder: 'Ex : Sarr',
    client_phone: 'Numéro de téléphone',
    client_phone_placeholder: 'Ex : 77 000 00 00',
    client_phone_unique_hint: 'Le numéro doit être unique (pas de doublon)',
    client_create_btn: 'Créer le profil client',
    client_creating: 'Création...',

    // Client Detail Modal
    client_sheet_title: 'Fiche Client',
    client_balance_label: 'Solde restant',
    client_total_credits_label: 'Total crédits :',
    client_total_payments_label: 'Paiements :',
    client_btn_credit: 'Nouveau Crédit',
    client_btn_payment: 'Encaisser Paiement',
    client_btn_whatsapp: 'Relance WhatsApp',
    client_btn_sms: 'Relance SMS',
    client_block_credit: 'Bloquer le crédit',
    client_unblock_credit: 'Débloquer le crédit',
    client_blocked_notice: 'Ce client est bloqué. Aucun nouveau crédit ne peut lui être accordé.',
    client_history_title: 'Historique des Crédits & Règlements',
    client_tab_credits: 'Crédits',
    client_tab_payments: 'Règlements',
    client_no_credits: 'Aucun crédit enregistré pour ce client.',
    client_no_payments: 'Aucun paiement enregistré pour ce client.',
    client_due_date: 'Échéance :',
    client_credit_details: 'Détails des articles',
    client_items_count: 'article(s)',

    // Reminder Modal
    reminder_title: 'Relance Client',
    reminder_subtitle: 'Message courtois et professionnel prêt à l’envoi',
    reminder_channel_whatsapp: 'WhatsApp',
    reminder_channel_sms: 'SMS classique',
    reminder_message_label: 'Message de relance',
    reminder_btn_copy: 'Copier le texte',
    reminder_copied: 'Copié !',
    reminder_btn_open_whatsapp: 'Ouvrir WhatsApp',
    reminder_btn_open_sms: 'Envoyer par SMS',
    reminder_template: (name, balanceStr) =>
      `Bonjour ${name}, petit rappel concernant ton solde de ${balanceStr} au carnet. Merci de nous tenir informés concernant le règlement. — Cheikh`,

    // Test Guide & Supabase
    guide_title: 'Guide des 6 Scénarios de Test',
    guide_subtitle: 'Vérifications directes au comptoir',
    guide_test_btn: 'Tester',
    guide_reset_btn: 'Réinitialiser les données de test',
    supabase_title: 'Base de données Supabase',
    supabase_active_badge: 'Connecté au Cloud',
    supabase_local_badge: 'Moteur local SQLite',
  },

  ar: {
    // App & Header
    app_title: 'دفتر الشيخ',
    app_subtitle: 'ديون الزبائن عند نقطة البيع',
    offline: 'غير متصل',
    install: 'تثبيت',
    supabase_cfg: 'إعدادات سوبابيز',
    scenarios_guide: 'دليل سيناريوهات الاختبار الستة',
    reset_test_data: 'إعادة ضبط البيانات التجريبية',
    reset_confirm: 'هل تريد إعادة ضبط كافة البيانات إلى الزبائن الخمسة الأوائل؟',
    cancel: 'إلغاء',
    close: 'إغلاق',
    confirm: 'تأكيد',
    loading: 'جارٍ التحميل...',
    edit: 'تعديل',
    delete: 'حذف',

    // Nav
    nav_accueil: 'الرئيسية',
    nav_clients: 'الزبائن',
    nav_new_credit: '+ دين جديد',
    nav_suivi: 'المتابعة',

    // Status Badges
    status_blocked: 'دين محظور',
    status_overdue: 'متأخر',
    status_overdue_days: 'متأخر ({days} يوم)',
    status_due_today: 'الاستحقاق اليوم',
    status_due_tomorrow: 'الاستحقاق غداً',
    status_due_soon: 'استحقاق قريب',
    status_settled: 'مسدد (0 FCFA)',
    status_up_to_date: 'منتظم',

    // Accueil
    kpi_credited_month: 'إجمالي الديون (هذا الشهر)',
    kpi_credited_sub: 'الشهر الحالي',
    kpi_recovered_month: 'المسترجع (هذا الشهر)',
    kpi_recovered_sub: 'الدفعات المستلمة',
    kpi_remaining_total: 'المتبقي للاسترداد',
    kpi_remaining_sub: 'مستحق على جميع الزبائن',
    kpi_overdue_count: 'متأخرات الدفع',
    kpi_overdue_urgent: 'مطلوب تذكيرهم عاجلاً',
    kpi_overdue_none: 'لا توجد متأخرات حالياً',
    kpi_overdue_all_good: 'جميع الحسابات منتظمة ومحدثة!',
    section_priority_reminders: 'أولوية التذكير والمتابعة اليوم',
    priority_reminders_count: 'زبائن لديهم استحقاقات متأخرة أو وشيكة',
    total_debt_label: 'إجمالي الدين:',
    due_date_label: 'الاستحقاق:',
    action_whatsapp: 'واتساب',
    action_sms: 'رسالة SMS',
    action_collect: 'تحصيل',
    action_new_credit: 'دين جديد',
    action_client_sheet: 'ملف الزبون',
    no_reminders_today: 'لا يوجد زبائن بحاجة إلى تذكير اليوم!',
    no_reminders_desc: 'تم الوفاء بجميع الاستحقاقات أو تسوية كافة الديون.',
    section_quick_actions: 'إجراءات سريعة',
    quick_action_new_credit_title: 'دين جديد',
    quick_action_new_credit_sub: 'تسجيل دين سريع أو مفصل',
    quick_action_new_client_title: 'زبون جديد',
    quick_action_new_client_sub: 'إضافة زبون إلى الدفتر',
    quick_action_scenarios_title: 'عرض سيناريوهات العرض التوضيحي',
    quick_action_scenarios_sub: 'مامادو، موسى، عايدة، فاتو، عثمان',

    // Clients View
    clients_title: 'دليل الزبائن',
    clients_search_placeholder: 'البحث بالاسم، اللقب، رقم الهاتف...',
    filter_all: 'الكل',
    filter_overdue: 'متأخرون',
    filter_due_soon: 'قريباً',
    filter_up_to_date: 'منتظمون',
    filter_blocked: 'محظورون',
    filter_settled: 'مسددون',
    client_due: 'المتبقي:',
    client_credits: 'الديون:',
    client_paid: 'المدفوع:',
    client_last_due: 'تاريخ الاستحقاق:',
    client_no_debt: 'لا توجد ديون مستحقة',
    no_clients_found: 'لم يتم العثور على أي زبون',
    no_clients_desc: 'جرب كلمة بحث أخرى أو فلتر مختلف',
    view_full_sheet: 'عرض الملف الكامل',
    btn_new_client: 'زبون جديد',

    // Suivi View
    suivi_banner_title: 'متابعة ديون الزبائن عند نقطة البيع',
    suivi_banner_desc:
      'رؤية واضحة وفورية للإجابة على الأسئلة الأربعة: من يدين لي؟ كم المبلغ؟ منذ متى؟ ومن يجب تذكيره؟',
    suivi_month_situation: 'وضع الشهر الحالي',
    suivi_month_current: 'الشهر الحالي',
    suivi_credits_granted: 'الديون الممنوحة',
    suivi_recovered_amounts: 'المبالغ المسترجعة',
    suivi_net_month: 'الصافي المحقق هذا الشهر',
    suivi_global_situation: 'الوضع العام التراكمي',
    suivi_total_cumulative_credits: 'إجمالي الديون التراكمي',
    suivi_total_cumulative_payments: 'إجمالي السدادات التراكمي',
    suivi_total_remaining_due: 'إجمالي المتبقي المستحق',
    suivi_recovery_rate: 'معدل التحصيل العام:',
    suivi_plan_title: 'خطة التحصيل ذات الأولوية',
    suivi_plan_subtitle: 'ترتيب الزبائن حسب درجة استعجال التحصيل',
    suivi_cat_overdue: '١. حالات عاجلة (متأخرون)',
    suivi_cat_due_soon: '٢. استحقاقات وشيكة',
    suivi_cat_blocked: '٣. زبائن محظورون',
    suivi_cat_up_to_date: '٤. زبائن منتظمون',
    suivi_no_overdue: 'لا يوجد زبائن متأخرون!',
    suivi_no_due_soon: 'لا توجد استحقاقات خلال الأيام الثلاثة القادمة.',
    suivi_no_blocked: 'لا يوجد زبائن محظورون حالياً.',
    suivi_no_debtors: 'جميع الزبائن منتظمون أو تمت تسوية حساباتهم بالكامل!',

    // Credit Modal
    credit_modal_title: 'منح دين جديد',
    credit_mode_express: 'تسجيل سريع',
    credit_mode_detailed: 'تسجيل مفصل (سلع)',
    credit_select_client: '١. الزبون',
    credit_choose_client: 'اختر زبوناً...',
    credit_quick_new_client: '+ زبون جديد',
    credit_client_blocked_warning: 'تنبيه: هذا الزبون محظور حالياً من أخذ ديون جديدة',
    credit_client_blocked_desc: 'وفقاً للقواعد، لا يمكن منح دين جديد دون تسوية الحساب أو إلغاء الحظر.',
    credit_unblock_btn: 'إلغاء الحظر والسماح بالدين',
    credit_express_amount_label: '٢. مبلغ الدين',
    credit_amount_placeholder: 'مثال: 15000',
    credit_description_label: '٣. الوصف أو الملاحظات (اختياري)',
    credit_description_placeholder: 'مثال: خبز، سكر، حليب، زيت...',
    credit_due_date_label: '٤. تاريخ الاستحقاق',
    credit_in_3_days: '+3 أيام',
    credit_in_7_days: '+ أسبوع',
    credit_in_15_days: '+15 يوماً',
    credit_in_30_days: '+ شهر',
    credit_detailed_items_label: '٢. السلع المأخوذة بالدين',
    credit_item_name: 'اسم السلعة',
    credit_item_qty: 'الكمية',
    credit_item_price: 'السعر الإجمالي (FCFA)',
    credit_add_item: '+ إضافة سلعة',
    credit_detailed_total: 'مجموع السلع المحسوب:',
    credit_submit: 'تأكيد الدين',
    credit_submitting: 'جارٍ الحفظ...',

    // Payment Modal
    payment_modal_title: 'تسجيل دفعة سداد',
    payment_counter: 'نقطة البيع',
    payment_client_label: '١. الزبون',
    payment_current_balance: 'الرصيد المتبقي المستحق:',
    payment_amount_label: '٢. المبلغ المدفوع',
    payment_amount_placeholder: 'مثال: 10000',
    payment_full_pay_btn: 'تسوية كاملة',
    payment_notes_label: '٣. ملاحظات أو طريقة الدفع',
    payment_notes_default: 'سداد نقدي عند نقطة البيع',
    payment_notes_placeholder: 'مثال: نقداً، ويف، أورانج موني...',
    payment_new_balance_label: 'الرصيد الجديد المحسوب:',
    payment_error_exceeds: 'المبلغ المدفوع يتجاوز الرصيد المستحق. لا يمكن للرصيد أن يصبح سالباً أبداً.',
    payment_submit: 'تأكيد استلام الدفعة',
    payment_submitting: 'جارٍ الحفظ...',

    // Client Modal
    client_modal_title: 'زبون جديد',
    client_modal_subtitle: 'إضافة زبون إلى دفتر الديون',
    client_first_name: 'الاسم الأول',
    client_first_name_placeholder: 'مثال: إبراهيم',
    client_last_name: 'اسم العائلة',
    client_last_name_placeholder: 'مثال: سار',
    client_phone: 'رقم الهاتف',
    client_phone_placeholder: 'مثال: 77 000 00 00',
    client_phone_unique_hint: 'يجب أن يكون رقم الهاتف فريداً (بدون تكرار)',
    client_create_btn: 'إنشاء حساب الزبون',
    client_creating: 'جارٍ الإنشاء...',

    // Client Detail Modal
    client_sheet_title: 'ملف الزبون',
    client_balance_label: 'الرصيد المتبقي',
    client_total_credits_label: 'إجمالي الديون:',
    client_total_payments_label: 'الدفعات:',
    client_btn_credit: 'دين جديد',
    client_btn_payment: 'تسجيل دفعة',
    client_btn_whatsapp: 'تذكير واتساب',
    client_btn_sms: 'تذكير SMS',
    client_block_credit: 'حظر منح الديون',
    client_unblock_credit: 'إلغاء حظر الديون',
    client_blocked_notice: 'هذا الزبون محظور. لا يمكن منح ديون جديدة له قبل التسوية.',
    client_history_title: 'سجل الديون والسدادات',
    client_tab_credits: 'الديون',
    client_tab_payments: 'الدفعات',
    client_no_credits: 'لا توجد ديون مسجلة لهذا الزبون.',
    client_no_payments: 'لا توجد دفعات مسجلة لهذا الزبون.',
    client_due_date: 'تاريخ الاستحقاق:',
    client_credit_details: 'تفاصيل السلع',
    client_items_count: 'سلعة',

    // Reminder Modal
    reminder_title: 'تذكير الزبون',
    reminder_subtitle: 'رسالة مهذبة واحترافية جاهزة للإرسال',
    reminder_channel_whatsapp: 'واتساب',
    reminder_channel_sms: 'رسالة SMS عادية',
    reminder_message_label: 'نص رسالة التذكير',
    reminder_btn_copy: 'نسخ النص',
    reminder_copied: 'تم النسخ!',
    reminder_btn_open_whatsapp: 'فتح واتساب',
    reminder_btn_open_sms: 'إرسال عبر SMS',
    reminder_template: (name, balanceStr) =>
      `السلام عليكم ${name}، تذكير لطيف بخصوص رصيدك المتبقي البالغ ${balanceStr} في الدفتر. نرجو التكرم بالتنسيق معنا بشأن السداد. — الشيخ`,

    // Test Guide & Supabase
    guide_title: 'دليل سيناريوهات الاختبار الستة',
    guide_subtitle: 'فحوصات مباشرة عند نقطة البيع',
    guide_test_btn: 'اختبار',
    guide_reset_btn: 'إعادة ضبط البيانات التجريبية',
    supabase_title: 'قاعدة بيانات سوبابيز',
    supabase_active_badge: 'متصل بالسحابة',
    supabase_local_badge: 'المحرك المحلي SQLite',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  isRTL: boolean;
  dir: 'ltr' | 'rtl';
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = 'credit_cheikh_language';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'ar' || saved === 'fr') return saved;
    } catch {
      // ignore
    }
    return 'fr';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const isRtl = language === 'ar';
    document.documentElement.lang = language;
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  }, [language]);

  const value: LanguageContextType = {
    language,
    setLanguage,
    t: translations[language],
    isRTL: language === 'ar',
    dir: language === 'ar' ? 'rtl' : 'ltr',
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

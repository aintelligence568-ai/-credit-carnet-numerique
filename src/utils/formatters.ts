export const formatFCFA = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
};

export const formatDateDisplay = (dateString: string, lang: 'fr' | 'ar' = 'fr'): string => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  const target = new Date(year, month - 1, day);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (lang === 'ar') {
    if (diffDays === 0) return 'اليوم';
    if (diffDays === 1) return 'غداً';
    if (diffDays === -1) return 'أمس';
    if (diffDays > 1 && diffDays <= 7) return `خلال ${diffDays} أيام`;
    if (diffDays < -1 && diffDays >= -30) return `منذ ${Math.abs(diffDays)} أيام`;

    return target.toLocaleDateString('ar-EG', {
      day: 'numeric',
      month: 'short',
      year: target.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Demain';
  if (diffDays === -1) return 'Hier';
  if (diffDays > 1 && diffDays <= 7) return `Dans ${diffDays} jours`;
  if (diffDays < -1 && diffDays >= -30) return `Il y a ${Math.abs(diffDays)} jours`;

  return target.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: target.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

export const formatDueDateRelative = (
  dateString: string,
  lang: 'fr' | 'ar' = 'fr'
): { text: string; isUrgent: boolean; isLate: boolean } => {
  if (!dateString) return { text: lang === 'ar' ? 'غير محدد' : 'Non définie', isUrgent: false, isLate: false };
  const [year, month, day] = dateString.split('-').map(Number);
  const target = new Date(year, month - 1, day);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const daysLate = Math.abs(diffDays);
    return {
      text:
        lang === 'ar'
          ? daysLate === 1
            ? 'متأخر يوم واحد'
            : `متأخر ${daysLate} أيام`
          : daysLate === 1
          ? 'Retard de 1 jour'
          : `En retard de ${daysLate} jours`,
      isUrgent: true,
      isLate: true,
    };
  } else if (diffDays === 0) {
    return {
      text: lang === 'ar' ? 'الاستحقاق اليوم' : "Échéance aujourd'hui",
      isUrgent: true,
      isLate: false,
    };
  } else if (diffDays === 1) {
    return {
      text: lang === 'ar' ? 'الاستحقاق غداً' : 'Échéance demain',
      isUrgent: true,
      isLate: false,
    };
  } else {
    return {
      text:
        lang === 'ar'
          ? `خلال ${diffDays} أيام (${formatDateDisplay(dateString, 'ar')})`
          : `Dans ${diffDays} jours (${formatDateDisplay(dateString, 'fr')})`,
      isUrgent: false,
      isLate: false,
    };
  }
};

export const formatCurrentMonth = (lang: 'fr' | 'ar' = 'fr'): string => {
  const now = new Date();
  if (lang === 'ar') {
    return now.toLocaleDateString('ar', { month: 'long', year: 'numeric' });
  }
  const formatted = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

export const formatTodayDate = (lang: 'fr' | 'ar' = 'fr'): string => {
  const now = new Date();
  if (lang === 'ar') {
    return now.toLocaleDateString('ar', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  const formatted = now.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

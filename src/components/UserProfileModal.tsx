import React, { useState } from 'react';
import { X, User, Phone, Store, LogOut, CheckCircle2, ShieldCheck, KeyRound, Edit3, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface UserProfileModalProps {
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ onClose }) => {
  const { user, logout, changePin, updateProfile } = useAuth();
  
  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [shopName, setShopName] = useState(user?.shopName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);

  // PIN changing state
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);

  const handleUpdateProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (!fullName.trim()) {
      setProfileError('Le nom du commerçant est requis.');
      return;
    }

    setIsSubmittingProfile(true);
    const res = await updateProfile({
      fullName: fullName.trim(),
      shopName: shopName.trim() || 'Ma Boutique',
      phone: phone.trim(),
    });
    setIsSubmittingProfile(false);

    if (res.success) {
      setProfileSuccess('Informations modifiées avec succès !');
      setTimeout(() => {
        setIsEditingProfile(false);
        setProfileSuccess(null);
      }, 1400);
    } else {
      setProfileError(res.error || 'Erreur lors de la mise à jour.');
    }
  };

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinSuccess(null);

    if (newPin !== confirmPin) {
      setPinError('Les deux nouveaux codes PIN ne correspondent pas.');
      return;
    }

    if (newPin.length < 4) {
      setPinError('Le nouveau code PIN doit comporter au moins 4 chiffres.');
      return;
    }

    setIsSubmittingPin(true);
    const res = await changePin(oldPin, newPin);
    setIsSubmittingPin(false);

    if (res.success) {
      setPinSuccess('Code PIN mis à jour avec succès !');
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
      setTimeout(() => {
        setIsChangingPin(false);
        setPinSuccess(null);
      }, 1500);
    } else {
      setPinError(res.error || 'Erreur lors de la modification.');
    }
  };

  const handleLogoutClick = () => {
    if (window.confirm('Voulez-vous verrouiller votre carnet et vous déconnecter ?')) {
      logout();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-sm sm:max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-200 max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="bg-emerald-800 text-white px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center border border-emerald-600">
              <User className="w-4 h-4 text-emerald-100" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">{user?.fullName || 'Commerçant'}</h3>
              <p className="text-[11px] text-emerald-200">{user?.shopName || 'Boutique'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-emerald-700/80 text-emerald-200 hover:text-white transition"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3.5 overflow-y-auto min-h-0 flex-1 overscroll-y-contain custom-scrollbar">
          {/* User Details / Profile Form */}
          {!isEditingProfile ? (
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2 text-xs text-slate-700">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Informations Boutique
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFullName(user?.fullName || '');
                    setShopName(user?.shopName || '');
                    setPhone(user?.phone || '');
                    setIsEditingProfile(true);
                    setIsChangingPin(false);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold transition"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Modifier</span>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Gérant :
                </span>
                <span className="font-semibold text-slate-900">{user?.fullName || 'Non renseigné'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5" /> Boutique :
                </span>
                <span className="font-semibold text-slate-900">{user?.shopName || 'Non renseigné'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Téléphone :
                </span>
                <span className="font-mono font-semibold text-slate-900">+221 {user?.phone}</span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Sécurité :
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                  PIN Protégé
                </span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpdateProfileSubmit} className="bg-slate-50 p-3.5 rounded-xl border border-emerald-200 space-y-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                  Modifier mes données
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="text-[11px] text-slate-500 hover:text-slate-800 underline"
                >
                  Annuler
                </button>
              </div>

              {profileError && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-800 text-[11px]">
                  {profileError}
                </div>
              )}
              {profileSuccess && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">
                  Nom du commerçant
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Cheikh Ndiaye"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">
                  Nom de la boutique
                </label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="Ex: Boutique Touba Sandaga"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">
                  Numéro de téléphone
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex: 771234567"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingProfile}
                className="w-full mt-2 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSubmittingProfile ? 'Enregistrement...' : 'Enregistrer les modifications'}</span>
              </button>
            </form>
          )}

          {/* Change PIN Accordion */}
          {!isChangingPin ? (
            <button
              type="button"
              onClick={() => {
                setIsChangingPin(true);
                setIsEditingProfile(false);
              }}
              className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-600" />
              <span>Modifier mon code PIN</span>
            </button>
          ) : (
            <form onSubmit={handleChangePinSubmit} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800">Changer de code PIN</span>
                <button
                  type="button"
                  onClick={() => setIsChangingPin(false)}
                  className="text-[11px] text-slate-500 hover:text-slate-800 underline"
                >
                  Annuler
                </button>
              </div>

              {pinError && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-800 text-[11px]">
                  {pinError}
                </div>
              )}
              {pinSuccess && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{pinSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">
                  Ancien PIN
                </label>
                <input
                  type="password"
                  required
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={oldPin}
                  onChange={(e) => setOldPin(e.target.value)}
                  placeholder="••••"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 tracking-widest font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">
                  Nouveau PIN (4 chiffres)
                </label>
                <input
                  type="password"
                  required
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="••••"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 tracking-widest font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">
                  Confirmer nouveau PIN
                </label>
                <input
                  type="password"
                  required
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="••••"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 tracking-widest font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingPin}
                className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition"
              >
                {isSubmittingPin ? 'Enregistrement...' : 'Enregistrer le nouveau PIN'}
              </button>
            </form>
          )}

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogoutClick}
            className="w-full py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Verrouiller / Se déconnecter</span>
          </button>
        </div>
      </div>
    </div>
  );
};

# LON_SILA_MASTER_BLUEPRINT.md

> **PRODUIT** : LON SILA  
> **SOURCE DE VÉRITÉ** : Master Blueprint & Plan Directeur  
> **ORGANISATION** : AFRITERRA GROUP  
> **DATE DE MISE À JOUR** : Septembre 2026  
> **STATUT CONSTITUTIONNEL** : Source Unique de Vérité (Constitution de LON SILA)

---

## 0. Constitution de LON SILA & Règles Fondamentales

### 0.1 La Règle qui lie l'Assistant au Projet
Le rôle de l'assistant n'est pas seulement de produire des idées. Il est de **protéger la cohérence, la simplicité, la vision et la pérennité de LON SILA et d'AFRITERRA**. Si une proposition fragilise le projet, il doit le signaler clairement, même si elle paraît séduisante. Il ne l'intégrera qu'après une décision explicite du fondateur.

### 0.2 Règle d'Intégration au Projet
Aucune idée ne sera considérée comme "intégrée au projet" tant qu'elle n'aura pas été inscrite dans ce Blueprint.
- Nos conversations servent à réfléchir.
- Le Blueprint sert à décider.

### 0.3 Statuts Officiels des Idées
- 🟢 **VALIDÉE** : Intégrée au Blueprint et dans le code actif
- 🟡 **EN OBSERVATION** : Intéressante, mais nécessite davantage de validation
- 🔵 **EN RECHERCHE** : AFRITERRA doit encore acquérir ou formaliser l'expertise
- ⚪ **PARKING STRATÉGIQUE** : Bonne idée, mais prévue pour une version future
- 🔴 **REFUSÉE** : Contraire à la vision ou à l'architecture (ex: fioritures, ERP lourd pour petits commerçants)

### 0.4 Cycle de Vie Officiel d'une Idée
`Idée` ➔ `Discussion` ➔ `Analyse stratégique` ➔ `Validation par le Conseil d'Architecture` ➔ `Intégration au Blueprint` ➔ `Prototype` ➔ `Expérimentation terrain` ➔ `Développement` ➔ `Tests` ➔ `Déploiement` ➔ `Retours utilisateurs` ➔ `Amélioration continue`

---

## 1. Executive Summary

LON SILA réinvente les outils de gestion pour le commerce et le tissu économique de proximité en Afrique. L'application mobile-first « Le Carnet de Crédit Numérique de Cheikh » constitue le premier jalon opérationnel (Étape 10 : Prototype PWA).

---

## 2. Vision & 3. Mission

Permettre aux commerçants de proximité (boutiquiers de quartier comme Cheikh) de piloter et sécuriser leurs relations de crédit client sans friction technique, en éliminant les pertes de carnets papier, les oublis de calcul et les tensions lors des relances.

---

## 4. Philosophie & 5. Valeurs

- **Simplicité radicale** : Une action au comptoir doit prendre moins de 5 secondes.
- **Réalisme terrain** : Adapté aux connexions instables (PWA Offline First) et aux smartphones Android standard.
- **Respect du lien social** : Le crédit informel repose sur la confiance humaine; l'outil assiste Cheikh sans déshumaniser la relation client.
- **Zéro surplus (Anti-Slop)** : Pas d'ERP, pas de comptabilité lourde, pas de module de stock superflu dans le carnet de crédit.

---

## 6. AFRITERRA GROUP & 7. Positionnement

Plateforme de souveraineté numérique et d'autonomisation économique locale.

---

## 8. Les Problèmes que LON SILA Résout

- Pages de carnets papier déchirées, tachées ou perdues.
- Calculs manuels de soldes sujets aux contestations ou erreurs.
- Échéances oubliées et retards accumulés qui assèchent la trésorerie de la boutique.
- Gêne ou maladresse lors des relances clients.

---

## 9. Personas

- **Cheikh (Commerçant)** : Boutiquier de quartier, rapide au comptoir, téléphone Android en main, jongle entre la vente et la gestion des ardoises.
- **Les Clients du quartier** : Mamadou, Fatou, Moussa, Aïda, Ousmane (habitués, familles, voisins).

---

## 10. Parcours Utilisateurs

1. **Prise de crédit au comptoir** : Choix du client ➔ Montant ➔ Échéance ➔ Enregistrer (Mode Express).
2. **Paiement d'un acompte** : Choix du client ➔ Montant payé ➔ Validation immédiate du nouveau solde.
3. **Cockpit du matin** : Consultation des retards et relances WhatsApp / SMS en 1 clic.

---

## 11. Architecture Territoriale & 12. Architecture SaaS & 13. Architecture Technique

- **Frontend** : React 19, TypeScript, Tailwind CSS, Lucide Icons, Motion.
- **Standard PWA** : Service Worker (`vite-plugin-pwa`), Web Manifest, Android Standalone, Offline Ready.
- **Persistance Prototype** : LocalStorage avec données initiales réalistes et réinitialisables.

---

## 14. Product Blueprint : « Le Carnet de Crédit Numérique de Cheikh » (Étape 10) 🟢 VALIDÉE

### Spécifications Fonctionnelles PWA :
- **Espace 1 : Accueil (Cockpit quotidien)**
  - Total donné à crédit ce mois-ci
  - Total récupéré ce mois-ci
  - Total restant à récupérer
  - Nombre de clients en retard
  - Section « À relancer » (priorité retards et échéances proches)
  - Bouton d'action rapide « + Crédit »
- **Espace 2 : Clients**
  - Recherche instantanée (Nom, Prénom, Téléphone)
  - Fiche client complète (Solde calculé, Statut, Historique crédits/paiements, Échéances)
  - Actions : « + Crédit », « Enregistrer paiement », « WhatsApp », « SMS », « Bloquer/Autoriser »
- **Espace 3 : Suivi**
  - Répond à : Qui me doit ? Combien ? Depuis quand ? Qui dois-je relancer ?
  - Situation mensuelle et globale

---

## 15 à 30. Roadmap, Sécurité, Offline First, GTM, Glossaire & Annexes

- **Offline First** : 🟢 VALIDÉE — L'application fonctionne sans connexion réseau active.
- **Sécurité** : 🟢 VALIDÉE — Validation stricte de chaque envoi de message par Cheikh (aucun envoi automatique).
- **Refus formel 🔴** : Caisse complexe, facturation fiscale, gestion de stock, modules comptables dans le carnet de crédit.

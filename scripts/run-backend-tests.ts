import { initializeDatabase, seedCheikhInitialData, db, normalizePhone } from '../server/db';
import { CreditService } from '../server/services/creditService';

interface TestResult {
  id: number;
  name: string;
  passed: boolean;
  details: string;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runAllTests() {
  console.log('====================================================');
  console.log('🚀 DÉMARRAGE DES 10 TESTS OBLIGATOIRES DU BACKEND');
  console.log('====================================================\n');

  // Initialize DB and reset seeds with cleanAll = true
  initializeDatabase();
  seedCheikhInitialData(true, true);

  const CHEIKH_USER_ID = 'user-cheikh-1';

  // -------------------------------------------------------------
  // TEST 1: Mamadou doit 25 000. Paiement de 10 000. Résultat : 15 000.
  // -------------------------------------------------------------
  try {
    const mamadouBefore = CreditService.getClientSummary(CHEIKH_USER_ID, 'client-1')!;
    assert(mamadouBefore.balance === 25000, `Mamadou solde initial attendu: 25000, obtenu: ${mamadouBefore.balance}`);

    const payRes = CreditService.createPayment(CHEIKH_USER_ID, 'client-1', 10000, 'Paiement acompte');
    assert(payRes.newBalance === 15000, `Solde après paiement attendu: 15000, obtenu: ${payRes.newBalance}`);

    const mamadouAfter = CreditService.getClientSummary(CHEIKH_USER_ID, 'client-1')!;
    assert(mamadouAfter.balance === 15000, `Solde vérifié en base attendu: 15000, obtenu: ${mamadouAfter.balance}`);
    assert(mamadouAfter.totalPayments === 10000, `Total paiements attendu: 10000, obtenu: ${mamadouAfter.totalPayments}`);

    results.push({
      id: 1,
      name: 'Paiement partiel Mamadou (25 000 - 10 000 = 15 000)',
      passed: true,
      details: `Solde initial: 25 000 FCFA | Paiement: 10 000 FCFA | Nouveau solde calculé: ${mamadouAfter.balance} FCFA`,
    });
  } catch (err: any) {
    results.push({
      id: 1,
      name: 'Paiement partiel Mamadou',
      passed: false,
      details: 'Échec du calcul de solde après paiement',
      error: err.message,
    });
  }

  // -------------------------------------------------------------
  // TEST 2: Moussa : 45 000 de crédits, 10 000 de paiements, 35 000 de solde, Crédit bloqué.
  // Tentative de nouveau crédit doit être refusée.
  // -------------------------------------------------------------
  try {
    const moussa = CreditService.getClientSummary(CHEIKH_USER_ID, 'client-3')!;
    assert(moussa.totalCredits === 45000, `Moussa total crédits attendu: 45000, obtenu: ${moussa.totalCredits}`);
    assert(moussa.totalPayments === 10000, `Moussa total paiements attendu: 10000, obtenu: ${moussa.totalPayments}`);
    assert(moussa.balance === 35000, `Moussa solde attendu: 35000, obtenu: ${moussa.balance}`);
    assert(moussa.creditStatus === 'BLOCKED', `Moussa credit_status attendu: BLOCKED, obtenu: ${moussa.creditStatus}`);
    assert(moussa.isBlocked === true, 'Moussa isBlocked doit être true');

    // Tentative de nouveau crédit sans dérogation explicite
    let blockedErrorCaught = false;
    try {
      CreditService.createCredit(CHEIKH_USER_ID, 'client-3', 5000, '2026-09-30', 'EXPRESS', 'Test refusé');
    } catch (e: any) {
      if (e.code === 'CLIENT_BLOCKED') {
        blockedErrorCaught = true;
      }
    }
    assert(blockedErrorCaught, 'La tentative de crédit sur un client BLOCKED doit lever CLIENT_BLOCKED');

    results.push({
      id: 2,
      name: 'Moussa Ba crédits 45k, paiements 10k, solde 35k, statut BLOCKED & rejet nouveau crédit',
      passed: true,
      details: `Crédits: 45 000 | Paiements: 10 000 | Solde: 35 000 | Statut: BLOCKED | Code rejet: CLIENT_BLOCKED`,
    });
  } catch (err: any) {
    results.push({
      id: 2,
      name: 'Moussa Ba statut bloqué et rejet nouveau crédit',
      passed: false,
      details: 'Échec du contrôle de statut bloqué',
      error: err.message,
    });
  }

  // -------------------------------------------------------------
  // TEST 3: Créer un nouveau crédit pour Aïda. Le nombre de clients reste identique.
  // Aïda possède maintenant deux crédits.
  // -------------------------------------------------------------
  try {
    const clientsBefore = CreditService.listClients(CHEIKH_USER_ID);
    const countClientsBefore = clientsBefore.length;

    const aidaCreditsBefore = CreditService.getClientCredits(CHEIKH_USER_ID, 'client-4');
    assert(aidaCreditsBefore.length === 1, `Aïda crédits avant: attendu 1, obtenu ${aidaCreditsBefore.length}`);
    const aidaInitialBalance = CreditService.getClientSummary(CHEIKH_USER_ID, 'client-4')!.balance;

    // Ajouter un 2e crédit de 6000 FCFA
    const newCredit = CreditService.createCredit(
      CHEIKH_USER_ID,
      'client-4',
      6000,
      '2026-10-05',
      'EXPRESS',
      'Deuxième achat semoule'
    );

    const clientsAfter = CreditService.listClients(CHEIKH_USER_ID);
    assert(clientsAfter.length === countClientsBefore, `Nombre de clients doit rester ${countClientsBefore}, obtenu ${clientsAfter.length}`);

    const aidaCreditsAfter = CreditService.getClientCredits(CHEIKH_USER_ID, 'client-4');
    assert(aidaCreditsAfter.length === 2, `Aïda doit posséder 2 crédits, obtenu ${aidaCreditsAfter.length}`);

    const aidaSummaryAfter = CreditService.getClientSummary(CHEIKH_USER_ID, 'client-4')!;
    assert(
      aidaSummaryAfter.balance === aidaInitialBalance + 6000,
      `Nouveau solde Aïda attendu ${aidaInitialBalance + 6000}, obtenu ${aidaSummaryAfter.balance}`
    );

    results.push({
      id: 3,
      name: 'Nouveau crédit Aïda : clients inchangés, 2 crédits distincts, solde actualisé',
      passed: true,
      details: `Clients: ${countClientsBefore} (inchangé) | Crédits Aïda: 2 (8 500 + 6 000) | Nouveau solde: ${aidaSummaryAfter.balance} FCFA`,
    });
  } catch (err: any) {
    results.push({
      id: 3,
      name: 'Nouveau crédit Aïda',
      passed: false,
      details: 'Échec de la persistance multi-crédits pour client existant',
      error: err.message,
    });
  }

  // -------------------------------------------------------------
  // TEST 4: Fatou arrive à échéance demain. Elle doit apparaître comme DUE_SOON.
  // -------------------------------------------------------------
  try {
    const fatou = CreditService.getClientSummary(CHEIKH_USER_ID, 'client-2')!;
    assert(fatou.balance === 15000, `Fatou solde attendu 15000, obtenu ${fatou.balance}`);
    assert(fatou.status === 'DUE_SOON', `Statut de dette Fatou attendu DUE_SOON, obtenu ${fatou.status}`);
    assert(fatou.daysUntilDue === 1, `Fatou daysUntilDue attendu 1, obtenu ${fatou.daysUntilDue}`);

    results.push({
      id: 4,
      name: 'Fatou Sow échéance demain : statut calculé DUE_SOON',
      passed: true,
      details: `Échéance: Demain (+1j) | Statut de dette calculé: DUE_SOON (daysUntilDue: 1)`,
    });
  } catch (err: any) {
    results.push({
      id: 4,
      name: 'Fatou Sow statut DUE_SOON',
      passed: false,
      details: 'Échec du calcul dynamique de l’échéance imminente',
      error: err.message,
    });
  }

  // -------------------------------------------------------------
  // TEST 5: Ousmane : 20 000 crédit, 20 000 paiement, Solde zéro, Statut SETTLED.
  // -------------------------------------------------------------
  try {
    const ousmane = CreditService.getClientSummary(CHEIKH_USER_ID, 'client-5')!;
    assert(ousmane.totalCredits === 20000, `Total crédits attendu 20000, obtenu ${ousmane.totalCredits}`);
    assert(ousmane.totalPayments === 20000, `Total paiements attendu 20000, obtenu ${ousmane.totalPayments}`);
    assert(ousmane.balance === 0, `Solde restant attendu 0, obtenu ${ousmane.balance}`);
    assert(ousmane.status === 'SETTLED', `Statut de dette attendu SETTLED, obtenu ${ousmane.status}`);

    results.push({
      id: 5,
      name: 'Ousmane Fall : 20k crédits, 20k paiements, solde 0, statut SETTLED',
      passed: true,
      details: `Crédits: 20 000 | Paiements: 20 000 | Solde: 0 FCFA | Statut: SETTLED`,
    });
  } catch (err: any) {
    results.push({
      id: 5,
      name: 'Ousmane Fall statut SETTLED',
      passed: false,
      details: 'Échec de la détection du solde nul et du statut SETTLED',
      error: err.message,
    });
  }

  // -------------------------------------------------------------
  // TEST 6: Mamadou doit 15 000 (après le test 1) ou réinitialisons pour tester 25 000 vs 30 000.
  // Tentative de paiement de 30 000. La transaction doit être rejetée.
  // Aucun paiement de 30 000 ne doit être enregistré.
  // -------------------------------------------------------------
  try {
    const mamadou = CreditService.getClientSummary(CHEIKH_USER_ID, 'client-1')!;
    const curBalance = mamadou.balance;
    const attemptedAmount = curBalance + 5000; // Plus grand que le solde

    let rejected = false;
    let errorCode = '';
    try {
      CreditService.createPayment(CHEIKH_USER_ID, 'client-1', attemptedAmount, 'Tentative excédent');
    } catch (e: any) {
      if (e.code === 'PAYMENT_EXCEEDS_BALANCE') {
        rejected = true;
        errorCode = e.code;
      }
    }

    assert(rejected, 'Le paiement excédant le solde doit être rejeté');
    assert(errorCode === 'PAYMENT_EXCEEDS_BALANCE', `Code erreur attendu PAYMENT_EXCEEDS_BALANCE, obtenu ${errorCode}`);

    // Vérifier qu'aucun paiement n'a été inséré
    const invalidPaymentInDb = db.prepare(`
      SELECT * FROM payments WHERE client_id = 'client-1' AND amount = ?
    `).get(attemptedAmount);
    assert(!invalidPaymentInDb, 'Aucun enregistrement ne doit figurer dans la table payments');

    // Le solde doit rester strictement inchangé
    const mamadouAfter = CreditService.getClientSummary(CHEIKH_USER_ID, 'client-1')!;
    assert(mamadouAfter.balance === curBalance, `Solde doit rester ${curBalance}, obtenu ${mamadouAfter.balance}`);

    results.push({
      id: 6,
      name: 'Tentative de paiement excédentaire : rejet strict PAYMENT_EXCEEDS_BALANCE',
      passed: true,
      details: `Solde actuel: ${curBalance} FCFA | Tentative: ${attemptedAmount} FCFA | Rejeté: PAYMENT_EXCEEDS_BALANCE | Aucun paiement inséré`,
    });
  } catch (err: any) {
    results.push({
      id: 6,
      name: 'Paiement excédentaire rejeté',
      passed: false,
      details: 'Échec du contrôle strict anti-solde négatif',
      error: err.message,
    });
  }

  // -------------------------------------------------------------
  // TEST 7: Créer un client avec : 77 123 45 67 puis essayer : 771234567.
  // Le backend doit détecter le doublon après normalisation.
  // -------------------------------------------------------------
  try {
    const uniquePhoneRaw = '77 999 11 22';
    const normalizedExpected = '779991122';
    assert(normalizePhone(uniquePhoneRaw) === normalizedExpected, 'Normalisation de 77 999 11 22');

    // Création du premier client
    const c1 = CreditService.createClient(CHEIKH_USER_ID, 'Amadou', 'Gueye', uniquePhoneRaw);
    assert(c1.phone === normalizedExpected, `Téléphone stocké normalisé attendu ${normalizedExpected}, obtenu ${c1.phone}`);

    // Tentative de création d'un deuxième client avec variante d'écriture
    let duplicateRejected = false;
    let duplicateCode = '';
    try {
      CreditService.createClient(CHEIKH_USER_ID, 'Amadou Deux', 'Gueye', '779991122');
    } catch (e: any) {
      if (e.code === 'PHONE_ALREADY_EXISTS') {
        duplicateRejected = true;
        duplicateCode = e.code;
      }
    }

    assert(duplicateRejected, 'La création du doublon normalisé doit être rejetée');
    assert(duplicateCode === 'PHONE_ALREADY_EXISTS', `Code attendu PHONE_ALREADY_EXISTS, obtenu ${duplicateCode}`);

    results.push({
      id: 7,
      name: 'Normalisation téléphonique & rejet des doublons (77 999 11 22 == 779991122)',
      passed: true,
      details: `Création client 1: '77 999 11 22' -> stocké '${normalizedExpected}' | Tentative 2: '779991122' -> Rejeté PHONE_ALREADY_EXISTS`,
    });
  } catch (err: any) {
    results.push({
      id: 7,
      name: 'Normalisation téléphone et unicité',
      passed: false,
      details: 'Échec de la détection de doublon après normalisation',
      error: err.message,
    });
  }

  // -------------------------------------------------------------
  // TEST 8: Créer deux utilisateurs différents.
  // Vérifier que chacun ne voit que ses propres clients, crédits et paiements.
  // -------------------------------------------------------------
  try {
    const USER_2_ID = 'user-marchand-2';
    const now = new Date().toISOString();

    // Insérer second utilisateur si inexistant
    const existingUser2 = db.prepare('SELECT id FROM users WHERE id = ?').get(USER_2_ID);
    if (!existingUser2) {
      db.prepare(`
        INSERT INTO users (id, phone, full_name, shop_name, created_at, updated_at)
        VALUES (?, '780001122', 'Ibrahima', 'Boutique Fass', ?, ?)
      `).run(USER_2_ID, now, now);
    }

    // Créer un client pour le marchand 2
    const clientUser2 = CreditService.createClient(USER_2_ID, 'Saliou', 'Diop', '76 000 99 88');
    CreditService.createCredit(USER_2_ID, clientUser2.id, 12000, '2026-10-01', 'EXPRESS', 'Marchand 2 credit');

    // Vérifier l'isolation : Cheikh ne voit JAMAIS les clients ou crédits du marchand 2
    const cheikhClients = CreditService.listClients(CHEIKH_USER_ID);
    const user2Clients = CreditService.listClients(USER_2_ID);

    assert(!cheikhClients.some((c) => c.id === clientUser2.id), 'Cheikh ne doit pas voir le client du marchand 2');
    assert(user2Clients.some((c) => c.id === clientUser2.id), 'Le marchand 2 doit voir son client');
    assert(user2Clients.every((c) => c.userId === USER_2_ID), 'Tous les clients du marchand 2 lui appartiennent');

    // Vérifier que Cheikh ne peut pas consulter le résumé du client du marchand 2
    const leakAttempt = CreditService.getClientSummary(CHEIKH_USER_ID, clientUser2.id);
    assert(leakAttempt === null, 'Cheikh ne doit pas pouvoir lire le client du marchand 2');

    results.push({
      id: 8,
      name: 'Isolation stricte multi-utilisateurs (Cheikh vs. Marchand 2)',
      passed: true,
      details: `Commerçant 1 (Cheikh): ${cheikhClients.length} clients isolés | Commerçant 2 (Ibrahima): ${user2Clients.length} clients isolés | Aucune fuite de données`,
    });
  } catch (err: any) {
    results.push({
      id: 8,
      name: 'Isolation multi-utilisateurs',
      passed: false,
      details: 'Échec du cloisonnement des données entre commerçants',
      error: err.message,
    });
  }

  // -------------------------------------------------------------
  // TEST 9: Créer un client avec deux crédits ayant des échéances différentes.
  // Vérifier que le système distingue correctement les échéances au niveau des crédits.
  // -------------------------------------------------------------
  try {
    const test9Client = CreditService.createClient(CHEIKH_USER_ID, 'Khadija', 'Fall', '70 888 77 66');

    // Crédit A : Échéance dépassée (il y a 5 jours)
    const creditPast = CreditService.createCredit(
      CHEIKH_USER_ID,
      test9Client.id,
      10000,
      '2026-09-09',
      'EXPRESS',
      'Crédit urgent passé'
    );

    // Crédit B : Échéance future (dans 20 jours)
    const creditFuture = CreditService.createCredit(
      CHEIKH_USER_ID,
      test9Client.id,
      25000,
      '2026-10-04',
      'EXPRESS',
      'Crédit non échu'
    );

    const credits = CreditService.getClientCredits(CHEIKH_USER_ID, test9Client.id);
    assert(credits.length === 2, `Doit avoir 2 crédits, obtenu ${credits.length}`);

    const pastCreditItem = credits.find((c) => c.id === creditPast.creditId)!;
    const futureCreditItem = credits.find((c) => c.id === creditFuture.creditId)!;

    assert(pastCreditItem.status === 'OVERDUE', `Crédit passé doit être OVERDUE, obtenu ${pastCreditItem.status}`);
    assert(futureCreditItem.status === 'UP_TO_DATE', `Crédit futur doit être UP_TO_DATE, obtenu ${futureCreditItem.status}`);

    const summary = CreditService.getClientSummary(CHEIKH_USER_ID, test9Client.id)!;
    assert(summary.balance === 35000, `Solde global attendu 35000, obtenu ${summary.balance}`);
    assert(summary.status === 'OVERDUE', 'Le statut global doit refléter l’urgence du crédit en retard');

    results.push({
      id: 9,
      name: 'Multi-crédits à échéances distinctes : distinction granulaire (10k OVERDUE vs 25k UP_TO_DATE)',
      passed: true,
      details: `Crédit A (10 000 FCFA): OVERDUE | Crédit B (25 000 FCFA): UP_TO_DATE | Solde total: 35 000 FCFA`,
    });
  } catch (err: any) {
    results.push({
      id: 9,
      name: 'Distinction granulaire des échéances',
      passed: false,
      details: 'Échec du calcul indépendant par crédit',
      error: err.message,
    });
  }

  // -------------------------------------------------------------
  // TEST 10: Créer un crédit détaillé dont la somme des lignes ne correspond pas au montant total.
  // La transaction complète doit être rejetée. Aucune donnée partielle ne doit être créée.
  // -------------------------------------------------------------
  try {
    const test10Client = CreditService.createClient(CHEIKH_USER_ID, 'Modou', 'Sene', '77 333 22 11');

    const creditsCountBefore = CreditService.getClientCredits(CHEIKH_USER_ID, test10Client.id).length;

    // Tentative de crédit détaillé : Montant total déclaré = 10 000 FCFA
    // Somme des articles = 4000 + 3000 = 7000 FCFA (Discordance de 3000 FCFA !)
    let mismatchCaught = false;
    let mismatchCode = '';
    try {
      CreditService.createCredit(
        CHEIKH_USER_ID,
        test10Client.id,
        10000,
        '2026-09-30',
        'DETAILED',
        'Courses discordantes',
        [
          { name: 'Article 1', price: 4000, quantity: 1 },
          { name: 'Article 2', price: 3000, quantity: 1 },
        ]
      );
    } catch (e: any) {
      if (e.code === 'ITEMS_SUM_MISMATCH') {
        mismatchCaught = true;
        mismatchCode = e.code;
      }
    }

    assert(mismatchCaught, 'La discorance de somme doit lever ITEMS_SUM_MISMATCH');
    assert(mismatchCode === 'ITEMS_SUM_MISMATCH', `Code attendu ITEMS_SUM_MISMATCH, obtenu ${mismatchCode}`);

    // Vérifier l'atomicité : AUCUN crédit ni article n'a été inséré
    const creditsCountAfter = CreditService.getClientCredits(CHEIKH_USER_ID, test10Client.id).length;
    assert(creditsCountAfter === creditsCountBefore, 'Aucun crédit partiel ne doit être enregistré');

    const orphanItems = db.prepare(`
      SELECT * FROM credit_items WHERE item_name IN ('Article 1', 'Article 2')
    `).all();
    assert(orphanItems.length === 0, 'Aucun article orphelin ne doit être présent en base');

    results.push({
      id: 10,
      name: 'Transaction atomique mode détaillé : rejet strict en cas de discordance (7 000 != 10 000)',
      passed: true,
      details: `Montant déclaré: 10 000 | Somme articles: 7 000 | Rejeté: ITEMS_SUM_MISMATCH | Aucune donnée résiduelle (Rollback garanti)`,
    });
  } catch (err: any) {
    results.push({
      id: 10,
      name: 'Atomicité mode détaillé et discordance',
      passed: false,
      details: 'Échec du rollback de transaction atomique',
      error: err.message,
    });
  }

  // -------------------------------------------------------------
  // AFFICHAGE DU RAPPORT FINAL
  // -------------------------------------------------------------
  console.log('\n====================================================');
  console.log('📋 RAPPORT D’EXÉCUTION DES 10 TESTS BACKEND');
  console.log('====================================================\n');

  let passedCount = 0;
  for (const r of results) {
    const icon = r.passed ? '✅ [RÉUSSI]' : '❌ [ÉCHOUÉ]';
    console.log(`${icon} Test ${r.id} : ${r.name}`);
    console.log(`   Détails : ${r.details}`);
    if (r.error) {
      console.log(`   Erreur  : ${r.error}`);
    }
    if (r.passed) passedCount++;
  }

  console.log('\n----------------------------------------------------');
  console.log(`TOTAL : ${passedCount}/${results.length} tests validés avec succès.`);
  console.log('----------------------------------------------------\n');

  // Remettre la base aux données de test standard pour Cheikh
  seedCheikhInitialData(true);

  if (passedCount !== results.length) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Erreur fatale lors des tests backend :', err);
  process.exit(1);
});

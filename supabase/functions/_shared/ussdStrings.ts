const STRINGS: Record<string, Record<string, string>> = {
  eng: {
    welcome_overdue: "Welcome {name}.\n! Loan of {amount} UGX due {days} days ago.\n1. Repay ({outstanding} UGX)\n2. Partial repayment\n3. Credit score\n4. Help\n0. Lang: {lang}",
    welcome_active: "Welcome {name}.\nNext payment: {amount} UGX in {days} days.\n1. Repay now\n2. Loan details\n3. Credit score\n4. Tip\n0. Lang: {lang}",
    welcome_idle: "Welcome {name}!\nCredit score: {score} ({band})\nQualify up to {max_amount} UGX.\n1. Eligible lenders\n2. Score details\n3. Verify lender\n4. Help\n0. Lang: {lang}",
    welcome_new: "Welcome to Kakasa!\nLoans, credit scores &\nrepayments - right here.\n1. Register\n2. Learn more\n3. Language",
    register_name: "Enter your full name:",
    register_nin: "Enter your NIN:\n(e.g. CM9401027XXXXX)",
    register_lang: "Choose language:\n1. English\n2. Luganda\n3. Runyankole\n4. Acholi\n5. Ateso\n6. Lugbara\n7. Swahili",
    register_pin: "Set a 4-digit PIN\nfor secure payments:",
    register_done: "Welcome {name}!\nAccount ready.\n\nDial back anytime to:\n- Check credit score\n- Browse lenders\n- Manage loans",
    loan_list: "Your loans:\n{list}\n0. Back",
    repay_amount: "{provider}: {outstanding} UGX\nDue: {due_date}\n1. Full ({outstanding} UGX)\n2. Half ({half} UGX)\n3. Custom amount\n0. Back",
    repay_custom: "Enter amount (UGX):",
    repay_confirm: "Pay {amount} UGX via\nMobile Money on {phone}?\n\nRate: {rate}% included\nNo hidden fees.\n\nEnter PIN to confirm:",
    repay_success: "Paid {amount} UGX.\nReceipt: {receipt}\nRemaining: {remaining} UGX\n\nScore now: {score}\n{tip}",
    repay_bad_pin: "Wrong PIN. {attempts} left.\n\nEnter PIN:",
    repay_locked: "Too many attempts.\nTry again in 30 minutes.",
    score_view: "Credit Score: {score}\n{band}\n{trend}\n\nPayment: {payment}\nDebt: {debt}\nIncome: {income}\n1. What's this?\n2. Improve\n0. Back",
    score_improve: "Improve your score:\n- Pay on time (+5-15 pts)\n- Borrow under 30% income\n- Avoid multiple loans\n- Build credit history\n\nNext update: {date}",
    lenders_list: "Score {score} qualifies:\n{list}\n0. Back",
    lender_detail: "{name}\nUp to {max} UGX\n{min_rate}-{max_rate}%\n{term_min}-{term_max} months\n\nTo apply: download Kakasa app\nor visit an agent.",
    help_menu: "Help:\n1. What is Kakasa?\n2. How loans work\n3. About credit scores\n4. Contact support\n5. Verify a lender\n0. Back",
    help_kakasa: "Kakasa is a mobile lending\nplatform in Uganda.\nCheck scores, find lenders,\napply and repay - all here.",
    help_loans: "1. Check your credit score\n2. Browse eligible lenders\n3. Apply via the Kakasa app\n4. Get funds via Mobile Money\n5. Repay here or in-app",
    help_scores: "Your credit score (300-850)\nshows lenders how reliable\nyou are. Pay on time and\nborrow responsibly to grow it.",
    help_contact: "Call: 0800 XXX XXX\nWhatsApp: 0771 XXX XXX\nEmail: support@kakasa.app",
    tip_1: "Tip: Pay on time to boost your credit score by 5-15 points.",
    tip_2: "Tip: Borrow under 30% of your income for healthy credit.",
    tip_3: "Tip: One loan at a time keeps your score strong.",
    tip_4: "Tip: Check your score often - knowledge is power.",
    tip_5: "Tip: A longer credit history means better loan offers.",
    sms_pre_7d: "Hi {name}, your {provider} loan of {amount} UGX is due {due_date}. Dial *384*XXXX# to repay. - Kakasa",
    sms_pre_1d: "{name}, {amount} UGX due tomorrow. On-time payment protects your score. Dial *384*XXXX# now. - Kakasa",
    sms_overdue_3d: "{name}, {amount} UGX is {days} days overdue. Late payments lower your score. Dial *384*XXXX# to pay. - Kakasa",
    sms_payment_confirm: "Paid {amount} UGX for {provider} loan. Remaining: {remaining} UGX. Receipt: {receipt}. Score: {score}. - Kakasa",
    verify_prompt: "Enter lender name\nto verify:",
    verify_too_short: "Name too short.\nEnter at least 2 letters.\nDial back to try again.",
    verify_not_found: "WARNING: '{query}' is NOT\na verified lender on Kakasa.\nBe cautious with unknown\nproviders.\n\nDial back to browse\nverified lenders.",
    verify_multiple: "Matches for '{query}':\n{list}\n0. Back",
    verify_found: "{name} is a VERIFIED\nKakasa lender.\nMax: {max} UGX\nRate: {min_rate}-{max_rate}%\nTerm: {term_min}-{term_max} months\n1. Compare lenders\n2. How to apply\n0. Back",
    verify_compare: "Lender comparison:\n{comparison}",
    verify_apply: "To apply with {name}:\n\nDownload the Kakasa app\nor visit a Kakasa agent\nnear you.\n\nDial *384*44413# anytime.",
    invalid_input: "Invalid choice.\n\n{menu}",
    learn_more: "Kakasa helps you:\n- Get affordable loans\n- Track your credit score\n- Repay via Mobile Money\nAll in your language!\n1. Register\n0. Back",
  },
  lug: {
    welcome_overdue: "Tukusanyukidde {name}.\n! Looni ya {amount} UGX yali ebeera {days} days.\n1. Sasula ({outstanding} UGX)\n2. Sasula ekitundu\n3. Obubonero\n4. Obuyambi\n0. Limi: {lang}",
    welcome_active: "Tukusanyukidde {name}.\nOkusasula: {amount} UGX mu nnaku {days}.\n1. Sasula kati\n2. Ebikwata ku looni\n3. Obubonero\n4. Amagezi\n0. Limi: {lang}",
    welcome_idle: "Tukusanyukidde {name}!\nObubonero: {score} ({band})\nOsobola okufuna {max_amount} UGX.\n1. Abawoli\n2. Obubonero\n3. Kebera omuwozi\n4. Obuyambi\n0. Limi: {lang}",
    welcome_new: "Tukusanyukidde ku Kakasa!\nAmalooni, obubonero\nn'okusasula - wano.\n1. Wandiika\n2. Yiga ebisingawo\n3. Olulimi",
    register_name: "Wandiika erinnya lyo:",
    register_nin: "Wandiika NIN yo:\n(eky. CM9401027XXXXX)",
    register_lang: "Londa olulimi:\n1. English\n2. Oluganda\n3. Runyankole\n4. Leb Acoli\n5. Ateso\n6. Lugbara\n7. Kiswahili",
    register_pin: "Teeka PIN ya ennamba 4\nez'okukuuma okusasula:",
    register_done: "Tukusanyukidde {name}!\nAkawunti yo eteekeddwa.\n\nDdamu okukuba anytime.",
    sms_pre_7d: "Ssebo/Nnyabo {name}, looni yo eya {provider} eya {amount} UGX ebeera {due_date}. Kuba *384*XXXX# okusasula. - Kakasa",
    sms_pre_1d: "{name}, {amount} UGX ebeera enkya. Okusasula mu budde kukuuma obubonero bwo. Kuba *384*XXXX# kati. - Kakasa",
    sms_overdue_3d: "{name}, {amount} UGX eyayise ennaku {days}. Okukendeza okusasula kukendeza obubonero. Kuba *384*XXXX# okusasula. - Kakasa",
    sms_payment_confirm: "Osasulidde {amount} UGX ku looni ya {provider}. Ekisigadde: {remaining} UGX. Risiiti: {receipt}. Obubonero: {score}. - Kakasa",
    repay_confirm: "Sasula {amount} UGX ku\nMobile Money {phone}?\n\nOmuwendo: {rate}% munda\nTewali ssente z'okwekweka.\n\nTeeka PIN okukakasa:",
    repay_success: "Osasulidde {amount} UGX.\nRisiiti: {receipt}\nEkisigadde: {remaining} UGX\n\nObubonero: {score}\n{tip}",
    repay_bad_pin: "PIN enkyamu. {attempts} ezisigadde.\n\nTeeka PIN:",
    repay_locked: "Ogezezzaako emirundi mingi.\nDdamu mu ddakiika 30.",
    tip_1: "Amagezi: Sasula mu budde okwongera obubonero bwo.",
    tip_2: "Amagezi: Wewola wansi wa 30% w'ensimbi zo.",
    tip_3: "Amagezi: Looni emu ekuuma obubonero bwo.",
    tip_4: "Amagezi: Kebera obubonero bwo bulijjo.",
    tip_5: "Amagezi: Ebyafaayo bya looni biramba bikuyamba.",
    verify_prompt: "Wandiika erinnya\nly'omuwozi okukebera:",
    verify_too_short: "Erinnya ery'okumpi ennyo.\nWandiika obukulu 2.\nDdamu okugezaako.",
    verify_not_found: "KULABULA: '{query}' si\nmuwozi awakasibwe ku Kakasa.\nWegendereze n'abawozi\nobutamanyiddwa.",
    verify_multiple: "Ebikwatagana ne '{query}':\n{list}\n0. Ddayo",
    verify_found: "{name} AWAKASIBWE\nku Kakasa.\nObusinga: {max} UGX\nOmuwendo: {min_rate}-{max_rate}%\nEkiseera: {term_min}-{term_max} emyezi\n1. Geraageranya abawozi\n2. Engeri y'okusaba\n0. Ddayo",
    verify_compare: "Okugeraageranya:\n{comparison}",
    verify_apply: "Okusaba ne {name}:\n\nDownload app ya Kakasa\noba kyalira agent wa Kakasa\nali kumpi naawe.",
  },
};

const LANG_CODES = ["eng", "lug", "nyn", "ach", "teo", "lgg", "sw"];

const LANG_NAMES: Record<string, string> = {
  eng: "English",
  lug: "Luganda",
  nyn: "Runyankole",
  ach: "Acholi",
  teo: "Ateso",
  lgg: "Lugbara",
  sw: "Swahili",
};

export function ussdText(
  key: string,
  lang: string,
  vars?: Record<string, string>
): string {
  const langStrings = STRINGS[lang] ?? STRINGS["eng"]!;
  let text = langStrings[key] ?? STRINGS["eng"]![key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, v);
    }
  }
  return text;
}

export function nextLanguage(current: string): string {
  const idx = LANG_CODES.indexOf(current);
  return LANG_CODES[(idx + 1) % LANG_CODES.length]!;
}

export function languageName(code: string): string {
  return LANG_NAMES[code] ?? "English";
}

export function getTip(userId: string): string {
  const day = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (const ch of userId + day) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
  const tipIndex = (Math.abs(hash) % 5) + 1;
  return `tip_${tipIndex}`;
}

export { LANG_CODES, LANG_NAMES };

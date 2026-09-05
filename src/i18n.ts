// Static-text localization for SplitTabs. Only user-facing static copy lives here —
// dynamic/group-facing content (balances, settlements, add confirmations) stays in index.ts
// and is intentionally left in English so numbers/handles read the same for every member.

export const LANGS = ["en", "ru", "es", "pt", "id", "de", "tr", "uk", "fa", "ar", "hi"] as const;
export type Lang = (typeof LANGS)[number];
export type Key =
  | "start"
  | "help"
  | "addPrivateNudge"
  | "limitReached"
  | "exportProOnly"
  | "proGroupInfo"
  | "proRunInGroup"
  | "proDescription"
  | "thankYou"
  | "weeklySummaryTitle"
  | "nudgeLine"
  | "nudgeCooldown"
  | "nudgeReplyCount"
  | "btn_unlockProStars"
  | "btn_addToGroup"
  | "btn_shareBot"
  | "app_loading"
  | "app_moreApps"
  | "app_shareChat"
  | "app_shareStory"
  | "app_shareFail"
  | "app_errNoInit"
  | "app_errExpired"
  | "app_errBadSig"
  | "app_unlockPro"
  | "app_proOneTime"
  | "app_proMonthly"
  | "app_payDone"
  | "app_payCancelled"
  | "app_payFailed"
  | "app_title"
  | "app_balances"
  | "app_settle"
  | "app_group"
  | "app_storyText"
  | "app_empty";

/** ctx.from.language_code -> first two letters -> known table language, else "en". */
export function resolveLang(code?: string): Lang {
  const c = (code ?? "").slice(0, 2).toLowerCase();
  return (LANGS as readonly string[]).includes(c) ? (c as Lang) : "en";
}

/** Look up `key` for `lang` (falling back to English), substituting `{name}` tokens from `vars`.
 * `key` is `string` (not `Key`) so a dynamically-iterated key list — e.g. test/appi18n.test.ts's
 * `APP_KEYS` — type-checks under plain node without a `Key` import. */
export function t(lang: string, key: string, vars?: Record<string, string | number>): string {
  const l: Lang = (LANGS as readonly string[]).includes(lang) ? (lang as Lang) : "en";
  const k = key as Key;
  let s = TABLE[k][l] ?? TABLE[k].en;
  if (vars) for (const [kk, v] of Object.entries(vars)) s = s.replaceAll(`{${kk}}`, String(v));
  return s;
}

const TABLE: Record<Key, Record<Lang, string>> = {
  start: {
    en: "🧾 Who owes who, settled in the group chat.\nAdd me, then `/add 20 dinner @anna @ben`.\n`/balance` shows the tally, `/settle` the fewest transfers.\nFree: {free} expenses per group · /help",
    ru: "🧾 Кто кому должен — прямо в чате группы.\nДобавьте меня, затем `/add 20 dinner @anna @ben`.\n`/balance` покажет баланс, `/settle` — минимум переводов.\nБесплатно: {free} расходов на группу · /help",
    es: "🧾 Quién le debe a quién, resuelto en el chat del grupo.\nAgrégame, luego `/add 20 dinner @anna @ben`.\n`/balance` muestra el balance, `/settle` el mínimo de transferencias.\nGratis: {free} gastos por grupo · /help",
    pt: "🧾 Quem deve o quê, resolvido no chat do grupo.\nAdicione-me, depois `/add 20 dinner @anna @ben`.\n`/balance` mostra o saldo, `/settle` o mínimo de transferências.\nGrátis: {free} despesas por grupo · /help",
    id: "🧾 Siapa berutang ke siapa, langsung di grup.\nTambahkan aku, lalu `/add 20 dinner @anna @ben`.\n`/balance` menampilkan saldo, `/settle` transfer paling sedikit.\nGratis: {free} pengeluaran per grup · /help",
    de: "🧾 Wer wem was schuldet, direkt im Gruppenchat.\nFüge mich hinzu, dann `/add 20 dinner @anna @ben`.\n`/balance` zeigt den Stand, `/settle` die wenigsten Überweisungen.\nKostenlos: {free} Ausgaben pro Gruppe · /help",
    tr: "🧾 Kim kime borçlu, doğrudan grup sohbetinde.\nBeni ekle, sonra `/add 20 dinner @anna @ben`.\n`/balance` bakiyeyi gösterir, `/settle` en az transferi.\nÜcretsiz: grup başına {free} harcama · /help",
    uk: "🧾 Хто кому винен — прямо в чаті групи.\nДодайте мене, потім `/add 20 dinner @anna @ben`.\n`/balance` покаже баланс, `/settle` — мінімум переказів.\nБезкоштовно: {free} витрат на групу · /help",
    fa: "🧾 چه کسی به چه کسی بدهکار است، همین‌جا در گروه.\nمرا اضافه کنید، سپس `/add 20 dinner @anna @ben`.\n`/balance` مانده را نشان می‌دهد، `/settle` کمترین تراکنش را.\nرایگان: {free} هزینه در هر گروه · /help",
    ar: "🧾 من مدين لمن، مباشرة في محادثة المجموعة.\nأضفني، ثم `/add 20 dinner @anna @ben`.\n`/balance` يعرض الرصيد، `/settle` أقل عدد تحويلات.\nمجانًا: {free} مصروفًا لكل مجموعة · /help",
    hi: "🧾 किसका कितना बकाया है, ग्रुप चैट में ही तय।\nमुझे जोड़ें, फिर `/add 20 dinner @anna @ben`।\n`/balance` बैलेंस दिखाता है, `/settle` सबसे कम ट्रांसफ़र।\nमुफ़्त: प्रति ग्रुप {free} खर्च · /help",
  },
  help: {
    en: "🧾 *SplitTabs* splits group expenses.\n\nAdd me to a group, then:\n`/add 20 dinner @anna @ben` — you paid 20, split with Anna and Ben (and you)\n`/add 12.50 taxi` — split among everyone who has used me here\n`/balance` — who owes what\n`/settle` — fewest transfers to square up\n`/undo` — remove the last expense\n`/clear` — start over\n`/export` — CSV (Pro)\n\nFree: {free} expenses per group. Pro: unlimited + export, one-time {stars} ⭐ per group — /pro",
    ru: "🧾 *SplitTabs* делит расходы группы.\n\nДобавьте меня в группу, затем:\n`/add 20 dinner @anna @ben` — вы заплатили 20, делим с Anna и Ben (и вами)\n`/add 12.50 taxi` — делим между всеми, кто уже пользовался мной здесь\n`/balance` — кто кому должен\n`/settle` — минимум переводов, чтобы всё сошлось\n`/undo` — убрать последний расход\n`/clear` — начать заново\n`/export` — CSV (Pro)\n\nБесплатно: {free} расходов на группу. Pro: без ограничений + экспорт, разовый платёж {stars} ⭐ за группу — /pro",
    es: "🧾 *SplitTabs* divide los gastos del grupo.\n\nAgrégame a un grupo, luego:\n`/add 20 dinner @anna @ben` — pagaste 20, se divide con Anna y Ben (y tú)\n`/add 12.50 taxi` — se divide entre todos los que me han usado aquí\n`/balance` — quién debe qué\n`/settle` — menos transferencias para saldar todo\n`/undo` — quitar el último gasto\n`/clear` — empezar de nuevo\n`/export` — CSV (Pro)\n\nGratis: {free} gastos por grupo. Pro: ilimitado + exportar, pago único de {stars} ⭐ por grupo — /pro",
    pt: "🧾 *SplitTabs* divide as despesas do grupo.\n\nAdicione-me a um grupo, depois:\n`/add 20 dinner @anna @ben` — você pagou 20, dividido com Anna e Ben (e você)\n`/add 12.50 taxi` — dividido entre todos que já me usaram aqui\n`/balance` — quem deve o quê\n`/settle` — menos transferências para acertar tudo\n`/undo` — remover a última despesa\n`/clear` — recomeçar\n`/export` — CSV (Pro)\n\nGrátis: {free} despesas por grupo. Pro: ilimitado + exportação, pagamento único de {stars} ⭐ por grupo — /pro",
    id: "🧾 *SplitTabs* membagi pengeluaran grup.\n\nTambahkan aku ke grup, lalu:\n`/add 20 dinner @anna @ben` — kamu bayar 20, dibagi dengan Anna dan Ben (dan kamu)\n`/add 12.50 taxi` — dibagi ke semua yang pernah pakai aku di sini\n`/balance` — siapa berutang apa\n`/settle` — transfer paling sedikit untuk lunas\n`/undo` — hapus pengeluaran terakhir\n`/clear` — mulai ulang\n`/export` — CSV (Pro)\n\nGratis: {free} pengeluaran per grup. Pro: tanpa batas + ekspor, sekali bayar {stars} ⭐ per grup — /pro",
    de: "🧾 *SplitTabs* teilt Gruppenausgaben auf.\n\nFüge mich zu einer Gruppe hinzu, dann:\n`/add 20 dinner @anna @ben` — du hast 20 bezahlt, geteilt mit Anna und Ben (und dir)\n`/add 12.50 taxi` — geteilt unter allen, die mich hier schon genutzt haben\n`/balance` — wer schuldet was\n`/settle` — wenigste Überweisungen zum Ausgleich\n`/undo` — letzte Ausgabe entfernen\n`/clear` — neu anfangen\n`/export` — CSV (Pro)\n\nKostenlos: {free} Ausgaben pro Gruppe. Pro: unbegrenzt + Export, einmalig {stars} ⭐ pro Gruppe — /pro",
    tr: "🧾 *SplitTabs* grup harcamalarını böler.\n\nBeni bir gruba ekle, sonra:\n`/add 20 dinner @anna @ben` — 20 ödedin, Anna ve Ben ile paylaşıldı (ve sen)\n`/add 12.50 taxi` — burada beni kullanan herkes arasında paylaşılır\n`/balance` — kim ne kadar borçlu\n`/settle` — hesabı kapatmak için en az transfer\n`/undo` — son harcamayı kaldır\n`/clear` — sıfırla\n`/export` — CSV (Pro)\n\nÜcretsiz: grup başına {free} harcama. Pro: sınırsız + dışa aktarma, grup başına tek seferlik {stars} ⭐ — /pro",
    uk: "🧾 *SplitTabs* ділить витрати групи.\n\nДодайте мене до групи, потім:\n`/add 20 dinner @anna @ben` — ви заплатили 20, ділимо з Anna та Ben (і вами)\n`/add 12.50 taxi` — ділимо між усіма, хто вже користувався мною тут\n`/balance` — хто кому винен\n`/settle` — мінімум переказів, щоб усе зійшлося\n`/undo` — прибрати останню витрату\n`/clear` — почати заново\n`/export` — CSV (Pro)\n\nБезкоштовно: {free} витрат на групу. Pro: без обмежень + експорт, разовий платіж {stars} ⭐ за групу — /pro",
    fa: "🧾 *SplitTabs* هزینه‌های گروه را تقسیم می‌کند.\n\nمرا به یک گروه اضافه کنید، سپس:\n`/add 20 dinner @anna @ben` — شما 20 پرداختید، بین Anna و Ben (و شما) تقسیم می‌شود\n`/add 12.50 taxi` — بین همه کسانی که اینجا از من استفاده کرده‌اند تقسیم می‌شود\n`/balance` — چه کسی چقدر بدهکار است\n`/settle` — کمترین تراکنش برای تسویه\n`/undo` — حذف آخرین هزینه\n`/clear` — شروع دوباره\n`/export` — CSV (Pro)\n\nرایگان: {free} هزینه در هر گروه. Pro: نامحدود + خروجی، پرداخت یک‌باره {stars} ⭐ برای هر گروه — /pro",
    ar: "🧾 *SplitTabs* يقسّم مصاريف المجموعة.\n\nأضفني إلى مجموعة، ثم:\n`/add 20 dinner @anna @ben` — دفعت 20، مقسّمة مع Anna وBen (وأنت)\n`/add 12.50 taxi` — مقسّمة بين كل من استخدمني هنا\n`/balance` — من مدين لمن\n`/settle` — أقل عدد تحويلات للتسوية\n`/undo` — إزالة آخر مصروف\n`/clear` — البدء من جديد\n`/export` — CSV (Pro)\n\nمجانًا: {free} مصروفًا لكل مجموعة. Pro: غير محدود + تصدير، دفعة واحدة {stars} ⭐ لكل مجموعة — /pro",
    hi: "🧾 *SplitTabs* ग्रुप के खर्चों को बांटता है।\n\nमुझे किसी ग्रुप में जोड़ें, फिर:\n`/add 20 dinner @anna @ben` — आपने 20 चुकाए, Anna और Ben (और आप) के साथ बंटा\n`/add 12.50 taxi` — यहां मुझे इस्तेमाल करने वाले सभी में बंटता है\n`/balance` — किसका कितना बकाया है\n`/settle` — बराबर करने के लिए सबसे कम ट्रांसफ़र\n`/undo` — आख़िरी खर्च हटाएं\n`/clear` — फिर से शुरू करें\n`/export` — CSV (Pro)\n\nमुफ़्त: प्रति ग्रुप {free} खर्च। Pro: असीमित + एक्सपोर्ट, प्रति ग्रुप एकमुश्त {stars} ⭐ — /pro",
  },
  addPrivateNudge: {
    en: "Add me to a group first, then use /add there.",
    ru: "Сначала добавьте меня в группу, затем используйте /add там.",
    es: "Agrégame a un grupo primero, luego usa /add ahí.",
    pt: "Adicione-me a um grupo primeiro, depois use /add lá.",
    id: "Tambahkan aku ke grup dulu, lalu gunakan /add di sana.",
    de: "Füge mich zuerst zu einer Gruppe hinzu, dann nutze /add dort.",
    tr: "Önce beni bir gruba ekle, sonra orada /add kullan.",
    uk: "Спочатку додайте мене до групи, потім використовуйте /add там.",
    fa: "ابتدا مرا به یک گروه اضافه کنید، سپس /add را آنجا استفاده کنید.",
    ar: "أضفني إلى مجموعة أولًا، ثم استخدم /add هناك.",
    hi: "पहले मुझे किसी ग्रुप में जोड़ें, फिर वहां /add इस्तेमाल करें।",
  },
  limitReached: {
    en: "This group reached the free limit of {free} expenses. Pro is unlimited (one-time {stars} ⭐).",
    ru: "Эта группа достигла бесплатного лимита в {free} расходов. Pro без ограничений (разовый платёж {stars} ⭐).",
    es: "Este grupo alcanzó el límite gratuito de {free} gastos. Pro es ilimitado (pago único de {stars} ⭐).",
    pt: "Este grupo atingiu o limite grátis de {free} despesas. Pro é ilimitado (pagamento único de {stars} ⭐).",
    id: "Grup ini mencapai batas gratis {free} pengeluaran. Pro tanpa batas (sekali bayar {stars} ⭐).",
    de: "Diese Gruppe hat das kostenlose Limit von {free} Ausgaben erreicht. Pro ist unbegrenzt (einmalig {stars} ⭐).",
    tr: "Bu grup ücretsiz {free} harcama sınırına ulaştı. Pro sınırsızdır (tek seferlik {stars} ⭐).",
    uk: "Ця група досягла безкоштовного ліміту {free} витрат. Pro без обмежень (разовий платіж {stars} ⭐).",
    fa: "این گروه به محدودیت رایگان {free} هزینه رسیده است. Pro نامحدود است (پرداخت یک‌باره {stars} ⭐).",
    ar: "وصلت هذه المجموعة إلى الحد المجاني وهو {free} مصروفًا. Pro غير محدود (دفعة واحدة {stars} ⭐).",
    hi: "इस ग्रुप ने मुफ़्त सीमा {free} खर्च पूरी कर ली है। Pro असीमित है (एकमुश्त {stars} ⭐)।",
  },
  exportProOnly: {
    en: "CSV export is a Pro feature for this group.",
    ru: "Экспорт в CSV — функция Pro для этой группы.",
    es: "La exportación a CSV es una función Pro para este grupo.",
    pt: "A exportação CSV é um recurso Pro para este grupo.",
    id: "Ekspor CSV adalah fitur Pro untuk grup ini.",
    de: "CSV-Export ist eine Pro-Funktion für diese Gruppe.",
    tr: "CSV dışa aktarma bu grup için bir Pro özelliğidir.",
    uk: "Експорт у CSV — функція Pro для цієї групи.",
    fa: "خروجی CSV یک ویژگی Pro برای این گروه است.",
    ar: "تصدير CSV ميزة Pro لهذه المجموعة.",
    hi: "CSV एक्सपोर्ट इस ग्रुप के लिए Pro सुविधा है।",
  },
  proGroupInfo: {
    en: "Pro for this group: unlimited expenses + CSV export, one-time {stars} ⭐.",
    ru: "Pro для этой группы: неограниченные расходы + экспорт CSV, разовый платёж {stars} ⭐.",
    es: "Pro para este grupo: gastos ilimitados + exportación CSV, pago único de {stars} ⭐.",
    pt: "Pro para este grupo: despesas ilimitadas + exportação CSV, pagamento único de {stars} ⭐.",
    id: "Pro untuk grup ini: pengeluaran tanpa batas + ekspor CSV, sekali bayar {stars} ⭐.",
    de: "Pro für diese Gruppe: unbegrenzte Ausgaben + CSV-Export, einmalig {stars} ⭐.",
    tr: "Bu grup için Pro: sınırsız harcama + CSV dışa aktarma, tek seferlik {stars} ⭐.",
    uk: "Pro для цієї групи: необмежені витрати + експорт CSV, разовий платіж {stars} ⭐.",
    fa: "Pro برای این گروه: هزینه‌های نامحدود + خروجی CSV، پرداخت یک‌باره {stars} ⭐.",
    ar: "Pro لهذه المجموعة: مصاريف غير محدودة + تصدير CSV، دفعة واحدة {stars} ⭐.",
    hi: "इस ग्रुप के लिए Pro: असीमित खर्च + CSV एक्सपोर्ट, एकमुश्त {stars} ⭐।",
  },
  proRunInGroup: {
    en: "Run /pro inside the group you want to upgrade.",
    ru: "Запустите /pro внутри группы, которую хотите обновить.",
    es: "Ejecuta /pro dentro del grupo que quieres mejorar.",
    pt: "Execute /pro dentro do grupo que deseja atualizar.",
    id: "Jalankan /pro di dalam grup yang ingin kamu tingkatkan.",
    de: "Führe /pro in der Gruppe aus, die du upgraden möchtest.",
    tr: "Yükseltmek istediğin grubun içinde /pro çalıştır.",
    uk: "Запустіть /pro всередині групи, яку хочете оновити.",
    fa: "دستور /pro را داخل گروهی که می‌خواهید ارتقا دهید اجرا کنید.",
    ar: "شغّل /pro داخل المجموعة التي تريد ترقيتها.",
    hi: "जिस ग्रुप को अपग्रेड करना है, उसके अंदर /pro चलाएं।",
  },
  proDescription: {
    en: "Unlimited expenses and CSV export for one group. One-time payment, no subscription.",
    ru: "Неограниченные расходы и экспорт CSV для одной группы. Разовый платёж, без подписки.",
    es: "Gastos ilimitados y exportación CSV para un grupo. Pago único, sin suscripción.",
    pt: "Despesas ilimitadas e exportação CSV para um grupo. Pagamento único, sem assinatura.",
    id: "Pengeluaran tanpa batas dan ekspor CSV untuk satu grup. Sekali bayar, tanpa langganan.",
    de: "Unbegrenzte Ausgaben und CSV-Export für eine Gruppe. Einmalzahlung, kein Abo.",
    tr: "Bir grup için sınırsız harcama ve CSV dışa aktarma. Tek seferlik ödeme, abonelik yok.",
    uk: "Необмежені витрати та експорт CSV для однієї групи. Разовий платіж, без підписки.",
    fa: "هزینه‌های نامحدود و خروجی CSV برای یک گروه. پرداخت یک‌باره، بدون اشتراک.",
    ar: "مصاريف غير محدودة وتصدير CSV لمجموعة واحدة. دفعة واحدة، بدون اشتراك.",
    hi: "एक ग्रुप के लिए असीमित खर्च और CSV एक्सपोर्ट। एकमुश्त भुगतान, कोई सब्सक्रिप्शन नहीं।",
  },
  thankYou: {
    en: "✅ Pro unlocked for the group. Unlimited expenses and /export.\n\n/more — more free tools",
    ru: "✅ Pro активирован для группы. Неограниченные расходы и /export.\n\n/more — другие бесплатные инструменты",
    es: "✅ Pro activado para el grupo. Gastos ilimitados y /export.\n\n/more — más herramientas gratis",
    pt: "✅ Pro ativado para o grupo. Despesas ilimitadas e /export.\n\n/more — mais ferramentas grátis",
    id: "✅ Pro aktif untuk grup. Pengeluaran tanpa batas dan /export.\n\n/more — alat gratis lainnya",
    de: "✅ Pro für die Gruppe freigeschaltet. Unbegrenzte Ausgaben und /export.\n\n/more — weitere kostenlose Tools",
    tr: "✅ Grup için Pro açıldı. Sınırsız harcama ve /export.\n\n/more — daha fazla ücretsiz araç",
    uk: "✅ Pro активовано для групи. Необмежені витрати та /export.\n\n/more — інші безкоштовні інструменти",
    fa: "✅ Pro برای گروه فعال شد. هزینه‌های نامحدود و /export.\n\n/more — ابزارهای رایگان بیشتر",
    ar: "✅ تم تفعيل Pro للمجموعة. مصاريف غير محدودة و/export.\n\n/more — أدوات مجانية أخرى",
    hi: "✅ ग्रुप के लिए Pro अनलॉक हुआ। असीमित खर्च और /export।\n\n/more — और मुफ़्त टूल्स",
  },
  weeklySummaryTitle: {
    en: "📊 Weekly summary",
    ru: "📊 Недельная сводка",
    es: "📊 Resumen semanal",
    pt: "📊 Resumo semanal",
    id: "📊 Ringkasan mingguan",
    de: "📊 Wochenübersicht",
    tr: "📊 Haftalık özet",
    uk: "📊 Тижневий підсумок",
    fa: "📊 خلاصه هفتگی",
    ar: "📊 ملخص أسبوعي",
    hi: "📊 साप्ताहिक सारांश",
  },
  nudgeLine: {
    en: "⏰ Reminder: you have an unpaid balance in a group.",
    ru: "⏰ Напоминание: у вас есть непогашенный баланс в группе.",
    es: "⏰ Recordatorio: tienes un saldo pendiente en un grupo.",
    pt: "⏰ Lembrete: você tem um saldo pendente em um grupo.",
    id: "⏰ Pengingat: kamu punya saldo yang belum dibayar di sebuah grup.",
    de: "⏰ Erinnerung: Du hast einen offenen Saldo in einer Gruppe.",
    tr: "⏰ Hatırlatma: bir grupta ödenmemiş bakiyen var.",
    uk: "⏰ Нагадування: у вас є непогашений баланс у групі.",
    fa: "⏰ یادآوری: شما در یک گروه مانده حساب پرداخت‌نشده دارید.",
    ar: "⏰ تذكير: لديك رصيد غير مسدد في إحدى المجموعات.",
    hi: "⏰ रिमाइंडर: किसी ग्रुप में आपका बकाया बैलेंस है।",
  },
  nudgeCooldown: {
    en: "This group was already nudged in the last 24h. Try again later.",
    ru: "Этой группе уже отправляли напоминание за последние 24ч. Попробуйте позже.",
    es: "Este grupo ya recibió un recordatorio en las últimas 24h. Inténtalo más tarde.",
    pt: "Este grupo já recebeu um lembrete nas últimas 24h. Tente novamente mais tarde.",
    id: "Grup ini sudah diingatkan dalam 24 jam terakhir. Coba lagi nanti.",
    de: "Diese Gruppe wurde in den letzten 24 Stunden bereits erinnert. Versuche es später erneut.",
    tr: "Bu gruba son 24 saatte zaten hatırlatma gönderildi. Daha sonra tekrar dene.",
    uk: "Цій групі вже надсилали нагадування за останні 24 год. Спробуйте пізніше.",
    fa: "به این گروه در ۲۴ ساعت گذشته قبلاً یادآوری ارسال شده است. بعداً دوباره امتحان کنید.",
    ar: "تم تذكير هذه المجموعة بالفعل خلال آخر 24 ساعة. حاول مرة أخرى لاحقًا.",
    hi: "इस ग्रुप को पिछले 24 घंटे में पहले ही रिमाइंडर भेजा जा चुका है। बाद में फिर कोशिश करें।",
  },
  nudgeReplyCount: {
    en: "🔔 Reminded {n} member(s).",
    ru: "🔔 Напомнили {n} участнику(-ам).",
    es: "🔔 Se recordó a {n} miembro(s).",
    pt: "🔔 {n} membro(s) lembrado(s).",
    id: "🔔 Mengingatkan {n} anggota.",
    de: "🔔 {n} Mitglied(er) erinnert.",
    tr: "🔔 {n} üyeye hatırlatma gönderildi.",
    uk: "🔔 Нагадано {n} учаснику(-ам).",
    fa: "🔔 به {n} عضو یادآوری شد.",
    ar: "🔔 تم تذكير {n} عضوًا.",
    hi: "🔔 {n} सदस्य को याद दिलाया गया।",
  },
  btn_unlockProStars: {
    en: "Unlock Pro, {stars} ⭐",
    ru: "Разблокировать Pro, {stars} ⭐",
    es: "Desbloquear Pro, {stars} ⭐",
    pt: "Desbloquear Pro, {stars} ⭐",
    id: "Buka Pro, {stars} ⭐",
    de: "Pro freischalten, {stars} ⭐",
    tr: "Pro'yu Aç, {stars} ⭐",
    uk: "Розблокувати Pro, {stars} ⭐",
    fa: "باز کردن Pro، {stars} ⭐",
    ar: "فتح Pro، {stars} ⭐",
    hi: "Pro अनलॉक करें, {stars} ⭐",
  },
  btn_addToGroup: {
    en: "Add me to a group",
    ru: "Добавить в группу",
    es: "Agrégame a un grupo",
    pt: "Adicione-me a um grupo",
    id: "Tambahkan ke grup",
    de: "Zu Gruppe hinzufügen",
    tr: "Gruba ekle",
    uk: "Додати до групи",
    fa: "افزودن به گروه",
    ar: "أضفني إلى مجموعة",
    hi: "ग्रुप में जोड़ें",
  },
  btn_shareBot: {
    en: "📣 Share this bot",
    ru: "📣 Поделиться ботом",
    es: "📣 Compartir bot",
    pt: "📣 Compartilhar bot",
    id: "📣 Bagikan bot ini",
    de: "📣 Bot teilen",
    tr: "📣 Botu paylaş",
    uk: "📣 Поділитися ботом",
    fa: "📣 اشتراک‌گذاری ربات",
    ar: "📣 مشاركة البوت",
    hi: "📣 बॉट शेयर करें",
  },
  // --- Mini App (MINIAPP-SPEC.md §1/§5) --- the 14 shared app_* keys, copied verbatim from
  // habit/src/i18n.ts and nudge/src/i18n.ts rather than retranslated, plus 5 split-specific
  // keys (app_title, app_balances, app_settle, app_group, app_storyText).
  app_loading: {
    en: "Loading…", ru: "Загрузка…", es: "Cargando…", pt: "Carregando…", id: "Memuat…",
    de: "Wird geladen…", tr: "Yükleniyor…", uk: "Завантаження…", fa: "در حال بارگذاری…",
    ar: "جارٍ التحميل…", hi: "लोड हो रहा है…",
  },
  app_moreApps: {
    en: "More apps", ru: "Другие приложения", es: "Más apps", pt: "Mais apps", id: "Aplikasi lain",
    de: "Mehr Apps", tr: "Diğer uygulamalar", uk: "Інші застосунки", fa: "برنامه‌های بیشتر",
    ar: "تطبيقات أخرى", hi: "और ऐप्स",
  },
  app_shareChat: {
    en: "💬 Share to a chat", ru: "💬 Отправить в чат", es: "💬 Compartir en chat",
    pt: "💬 Enviar no chat", id: "💬 Bagikan ke chat", de: "💬 In Chat teilen",
    tr: "💬 Sohbette paylaş", uk: "💬 Надіслати в чат", fa: "💬 ارسال به گفتگو",
    ar: "💬 مشاركة في محادثة", hi: "💬 चैट में भेजें",
  },
  app_shareStory: {
    en: "📣 Share to story", ru: "📣 В историю", es: "📣 A tu historia", pt: "📣 Nos stories",
    id: "📣 Bagikan ke story", de: "📣 Als Story teilen", tr: "📣 Hikâyede paylaş",
    uk: "📣 В історію", fa: "📣 اشتراک در استوری", ar: "📣 مشاركة في قصة", hi: "📣 स्टोरी में साझा करें",
  },
  app_shareFail: {
    en: "Sharing is unavailable right now.", ru: "Поделиться сейчас не получилось.",
    es: "Ahora mismo no se puede compartir.", pt: "Não foi possível compartilhar agora.",
    id: "Berbagi sedang tidak tersedia.", de: "Teilen ist gerade nicht möglich.",
    tr: "Şu anda paylaşılamıyor.", uk: "Поділитися зараз не вдалося.",
    fa: "در حال حاضر اشتراک‌گذاری ممکن نیست.", ar: "المشاركة غير متاحة الآن.",
    hi: "अभी साझा नहीं किया जा सकता।",
  },
  app_errNoInit: {
    en: "Open this app from the bot — tap the menu button.",
    ru: "Откройте это приложение из бота — кнопка меню.",
    es: "Abre esta app desde el bot — toca el botón de menú.",
    pt: "Abra este app pelo bot — toque no botão de menu.",
    id: "Buka aplikasi ini dari bot — ketuk tombol menu.",
    de: "Öffne diese App über den Bot — tippe auf den Menü-Button.",
    tr: "Bu uygulamayı bottan aç — menü düğmesine dokun.",
    uk: "Відкрийте застосунок із бота — кнопка меню.",
    fa: "این برنامه را از داخل ربات باز کنید — دکمه منو.",
    ar: "افتح هذا التطبيق من البوت — زر القائمة.",
    hi: "यह ऐप बॉट से खोलें — मेनू बटन दबाएँ।",
  },
  app_errExpired: {
    en: "This session expired. Close and reopen the app.",
    ru: "Сессия истекла. Закройте и откройте приложение снова.",
    es: "La sesión caducó. Cierra y vuelve a abrir la app.",
    pt: "A sessão expirou. Feche e abra o app de novo.",
    id: "Sesi berakhir. Tutup lalu buka lagi aplikasinya.",
    de: "Sitzung abgelaufen. App schließen und neu öffnen.",
    tr: "Oturum doldu. Uygulamayı kapatıp yeniden aç.",
    uk: "Сесія завершилася. Закрийте й відкрийте застосунок.",
    fa: "نشست منقضی شد. برنامه را ببندید و دوباره باز کنید.",
    ar: "انتهت الجلسة. أغلق التطبيق ثم افتحه من جديد.",
    hi: "सेशन खत्म हो गया। ऐप बंद करके फिर खोलें।",
  },
  app_errBadSig: {
    en: "This link is not valid. Reopen the app from the bot.",
    ru: "Ссылка недействительна. Откройте приложение из бота.",
    es: "Este enlace no es válido. Abre la app desde el bot.",
    pt: "Este link não é válido. Abra o app pelo bot.",
    id: "Tautan ini tidak valid. Buka aplikasi dari bot.",
    de: "Dieser Link ist ungültig. Öffne die App über den Bot.",
    tr: "Bu bağlantı geçersiz. Uygulamayı bottan aç.",
    uk: "Посилання недійсне. Відкрийте застосунок із бота.",
    fa: "این پیوند معتبر نیست. برنامه را از ربات باز کنید.",
    ar: "هذا الرابط غير صالح. افتح التطبيق من البوت.",
    hi: "यह लिंक मान्य नहीं है। ऐप बॉट से खोलें।",
  },
  app_unlockPro: {
    en: "🔓 Unlock Pro", ru: "🔓 Открыть Pro", es: "🔓 Desbloquear Pro", pt: "🔓 Desbloquear Pro",
    id: "🔓 Buka Pro", de: "🔓 Pro freischalten", tr: "🔓 Pro'yu aç", uk: "🔓 Відкрити Pro",
    fa: "🔓 فعال‌سازی Pro", ar: "🔓 تفعيل Pro", hi: "🔓 Pro अनलॉक करें",
  },
  app_proOneTime: {
    en: "One-time {n} ⭐", ru: "Разово {n} ⭐", es: "Pago único {n} ⭐", pt: "Único {n} ⭐",
    id: "Sekali bayar {n} ⭐", de: "Einmalig {n} ⭐", tr: "Tek seferlik {n} ⭐",
    uk: "Разово {n} ⭐", fa: "یک‌باره {n} ⭐", ar: "مرة واحدة {n} ⭐", hi: "एकमुश्त {n} ⭐",
  },
  app_proMonthly: {
    en: "Monthly {n} ⭐/mo", ru: "Ежемесячно {n} ⭐", es: "Mensual {n} ⭐/mes", pt: "Mensal {n} ⭐/mês",
    id: "Bulanan {n} ⭐/bln", de: "Monatlich {n} ⭐", tr: "Aylık {n} ⭐/ay", uk: "Щомісяця {n} ⭐",
    fa: "ماهانه {n} ⭐", ar: "شهريًا {n} ⭐", hi: "मासिक {n} ⭐",
  },
  app_payDone: {
    en: "✅ Pro unlocked. Thank you.", ru: "✅ Pro активирован. Спасибо.",
    es: "✅ Pro activado. Gracias.", pt: "✅ Pro ativado. Obrigado.", id: "✅ Pro aktif. Terima kasih.",
    de: "✅ Pro aktiviert. Danke.", tr: "✅ Pro açıldı. Teşekkürler.", uk: "✅ Pro активовано. Дякуємо.",
    fa: "✅ Pro فعال شد. سپاسگزاریم.", ar: "✅ تم تفعيل Pro. شكرًا لك.", hi: "✅ Pro चालू हो गया। धन्यवाद।",
  },
  app_payCancelled: {
    en: "Payment cancelled.", ru: "Оплата отменена.", es: "Pago cancelado.", pt: "Pagamento cancelado.",
    id: "Pembayaran dibatalkan.", de: "Zahlung abgebrochen.", tr: "Ödeme iptal edildi.",
    uk: "Оплату скасовано.", fa: "پرداخت لغو شد.", ar: "أُلغيت عملية الدفع.", hi: "भुगतान रद्द हुआ।",
  },
  app_payFailed: {
    en: "Payment failed. Please try again.", ru: "Оплата не прошла. Попробуйте ещё раз.",
    es: "El pago falló. Inténtalo de nuevo.", pt: "O pagamento falhou. Tente de novo.",
    id: "Pembayaran gagal. Coba lagi.", de: "Zahlung fehlgeschlagen. Bitte erneut versuchen.",
    tr: "Ödeme başarısız. Tekrar dene.", uk: "Оплата не пройшла. Спробуйте ще раз.",
    fa: "پرداخت ناموفق بود. دوباره تلاش کنید.", ar: "فشل الدفع. حاول مرة أخرى.",
    hi: "भुगतान विफल। फिर कोशिश करें।",
  },
  app_title: {
    en: "🧾 Your groups", ru: "🧾 Ваши группы", es: "🧾 Tus grupos", pt: "🧾 Seus grupos",
    id: "🧾 Grup Anda", de: "🧾 Deine Gruppen", tr: "🧾 Gruplarınız", uk: "🧾 Ваші групи",
    fa: "🧾 گروه‌های شما", ar: "🧾 مجموعاتك", hi: "🧾 आपके ग्रुप",
  },
  app_balances: {
    en: "Balances", ru: "Балансы", es: "Balances", pt: "Saldos", id: "Saldo", de: "Salden",
    tr: "Bakiyeler", uk: "Баланси", fa: "مانده‌ها", ar: "الأرصدة", hi: "बैलेंस",
  },
  app_settle: {
    en: "Settle up", ru: "Рассчитаться", es: "Saldar cuentas", pt: "Acertar contas",
    id: "Selesaikan", de: "Ausgleichen", tr: "Hesabı kapat", uk: "Розрахуватися",
    fa: "تسویه حساب", ar: "التسوية", hi: "हिसाब चुकाएं",
  },
  app_group: {
    en: "Group", ru: "Группа", es: "Grupo", pt: "Grupo", id: "Grup", de: "Gruppe", tr: "Grup",
    uk: "Група", fa: "گروه", ar: "مجموعة", hi: "ग्रुप",
  },
  app_storyText: {
    en: "Split group expenses without the spreadsheet, right inside Telegram.",
    ru: "Делите расходы группы без таблиц — прямо в Telegram.",
    es: "Divide los gastos del grupo sin hojas de cálculo, directamente en Telegram.",
    pt: "Divida as despesas do grupo sem planilhas, direto no Telegram.",
    id: "Bagi pengeluaran grup tanpa spreadsheet, langsung di Telegram.",
    de: "Teile Gruppenausgaben ohne Tabelle, direkt in Telegram.",
    tr: "Grup harcamalarını tablo kullanmadan, doğrudan Telegram içinde böl.",
    uk: "Діліть витрати групи без таблиць — прямо в Telegram.",
    fa: "هزینه‌های گروه را بدون صفحه‌گسترده، مستقیم در تلگرام تقسیم کنید.",
    ar: "قسّم مصاريف المجموعة بدون جداول بيانات، مباشرة داخل تيليجرام.",
    hi: "बिना स्प्रेडशीट के, सीधे Telegram में ग्रुप के खर्च बांटें।",
  },
  // The app's "no groups yet" state: not in the base 14+5, but genuinely on screen (every
  // other bot's Mini App carries an app_empty), so it's a 20th key rather than a fabricated
  // English fallback (MINIAPP-SPEC.md §1 "No English literal may remain in the app body").
  app_empty: {
    en: "No groups yet. Add @SplitTabsBot to a group, then send {cmd}",
    ru: "Пока нет групп. Добавьте @SplitTabsBot в группу, затем отправьте {cmd}",
    es: "Aún no hay grupos. Agrega @SplitTabsBot a un grupo y envía {cmd}",
    pt: "Ainda não há grupos. Adicione @SplitTabsBot a um grupo e envie {cmd}",
    id: "Belum ada grup. Tambahkan @SplitTabsBot ke grup, lalu kirim {cmd}",
    de: "Noch keine Gruppen. Füge @SplitTabsBot zu einer Gruppe hinzu und sende {cmd}",
    tr: "Henüz grup yok. @SplitTabsBot'u bir gruba ekle, sonra {cmd} gönder",
    uk: "Поки що немає груп. Додайте @SplitTabsBot до групи, потім надішліть {cmd}",
    fa: "هنوز گروهی نیست. @SplitTabsBot را به یک گروه اضافه کنید، سپس {cmd} را بفرستید",
    ar: "لا توجد مجموعات بعد. أضف @SplitTabsBot إلى مجموعة، ثم أرسل {cmd}",
    hi: "अभी कोई ग्रुप नहीं है। @SplitTabsBot को किसी ग्रुप में जोड़ें, फिर {cmd} भेजें",
  },
};

/** The 11 language codes this bot ships, in table order. */
export const APP_LANGS: Lang[] = [...LANGS];

/** Every `app_*` key, for every language, as a plain object — the Mini App's embedded
 * `APP_I18N` dictionary. English fills any gap so a client lookup can never miss.
 * Both loops are bounded by the static table (11 languages x the app_* key set). */
export function appDict(): Record<string, Record<string, string>> {
  const keys = (Object.keys(TABLE) as Key[]).filter((k) => k.startsWith("app_"));
  const out: Record<string, Record<string, string>> = {};
  for (const l of LANGS) {
    const m: Record<string, string> = {};
    for (const k of keys) m[k] = TABLE[k][l] ?? TABLE[k].en;
    out[l] = m;
  }
  return out;
}

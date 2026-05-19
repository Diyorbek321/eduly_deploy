#!/usr/bin/env node
// Post-build SEO prerender step.
//
// Why: Eduly is a Vite SPA — the shipped index.html has an empty <div id="root">.
// Googlebot can render JS but it's slow and unreliable for ranking. We bake a
// keyword-rich, semantic snapshot of the marketing landing into <div id="root">.
// React's createRoot().render() will replace these children at hydration time,
// so users see the full interactive page; crawlers and JS-disabled clients see
// the static SEO content immediately.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distHtmlPath = path.resolve(__dirname, '..', 'dist', 'index.html');

if (!fs.existsSync(distHtmlPath)) {
  console.error(`[prerender] dist/index.html not found at ${distHtmlPath}. Run \`vite build\` first.`);
  process.exit(1);
}

// Static SEO snapshot — keyword-rich, semantic, no JS dependencies.
// Mirrors the content of src/pages/Landing.tsx but as plain HTML.
// Visual styles are inlined and minimal; this content is replaced on hydration.
const staticSnapshot = `
<noscript-fallback aria-hidden="false" style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#0f172a;max-width:1200px;margin:0 auto;padding:24px;">
  <header>
    <nav aria-label="Asosiy menyu">
      <a href="/" style="font-weight:700;font-size:20px;color:#ec5b13;text-decoration:none;">Eduly</a>
      <span style="margin-left:24px;">
        <a href="#features" style="margin-right:16px;color:#475569;">Imkoniyatlar</a>
        <a href="#ielts" style="margin-right:16px;color:#475569;">IELTS Mock Test</a>
        <a href="#pricing" style="margin-right:16px;color:#475569;">Tariflar</a>
        <a href="#faq" style="margin-right:16px;color:#475569;">FAQ</a>
        <a href="#contact" style="color:#475569;">Aloqa</a>
      </span>
    </nav>
  </header>

  <main>
    <section aria-label="Bosh banner" style="padding:48px 0;">
      <p style="display:inline-block;background:#ffedd5;color:#c2410c;padding:4px 12px;border-radius:9999px;font-size:12px;font-weight:600;">AI yordamchi · IELTS Mock Test · To'lov integratsiyasi</p>
      <h1 style="font-size:48px;line-height:1.1;font-weight:800;margin:16px 0;">Ta'lim markazingizni <span style="color:#ec5b13;">bitta platformada</span> boshqaring</h1>
      <p style="font-size:18px;color:#475569;max-width:640px;">Eduly — O'zbekistondagi ta'lim markazlari uchun zamonaviy boshqaruv platformasi. Talabalar, o'qituvchilar, guruhlar, to'lovlar (Click, Payme), davomat va IELTS Mock Test bitta joyda. O'zbek tilida, ishonchli va arzon.</p>
      <p style="margin-top:24px;">
        <a href="#contact" style="display:inline-block;background:#ec5b13;color:#fff;padding:12px 24px;border-radius:8px;font-weight:600;text-decoration:none;">Demoni ochish</a>
        <a href="#ielts" style="display:inline-block;border:1px solid #cbd5e1;color:#334155;padding:12px 24px;border-radius:8px;font-weight:500;text-decoration:none;margin-left:8px;">IELTS Mock Test</a>
      </p>
      <p style="margin-top:24px;color:#64748b;font-size:14px;">✓ <strong>2 oy bepul</strong> · ✓ Karta talab qilinmaydi · ✓ 1 daqiqada o'rnatish</p>
    </section>

    <section aria-label="Statistika" style="padding:32px 0;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;display:grid;grid-template-columns:repeat(4,1fr);gap:24px;text-align:center;">
      <div><strong style="font-size:32px;color:#ec5b13;display:block;">250+</strong><span style="color:#64748b;font-size:14px;">Faol ta'lim markazlari</span></div>
      <div><strong style="font-size:32px;color:#ec5b13;display:block;">18 000+</strong><span style="color:#64748b;font-size:14px;">Boshqarilgan talabalar</span></div>
      <div><strong style="font-size:32px;color:#ec5b13;display:block;">99.9%</strong><span style="color:#64748b;font-size:14px;">Uptime kafolati</span></div>
      <div><strong style="font-size:32px;color:#ec5b13;display:block;">24/7</strong><span style="color:#64748b;font-size:14px;">Texnik yordam</span></div>
    </section>

    <section id="features" aria-labelledby="features-h" style="padding:64px 0;">
      <h2 id="features-h" style="font-size:32px;font-weight:700;text-align:center;">Hamma narsa bitta joyda</h2>
      <p style="text-align:center;color:#475569;margin-bottom:32px;">Ta'lim markazi uchun zarur bo'lgan barcha modullar.</p>
      <ul style="list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;">
        <li><h3 style="font-size:16px;margin:0 0 4px;">Talabalar boshqaruvi</h3><p style="color:#64748b;font-size:14px;margin:0;">Ro'yxatdan o'tish, profillar, davomat va to'lovlarni bir joyda kuzating. CRM, segmentlash, eksport.</p></li>
        <li><h3 style="font-size:16px;margin:0 0 4px;">O'qituvchilar paneli</h3><p style="color:#64748b;font-size:14px;margin:0;">Dars jadvali, davomat, uy vazifalari va ish haqi uchun maxsus interfeys.</p></li>
        <li><h3 style="font-size:16px;margin:0 0 4px;">Kurslar va guruhlar</h3><p style="color:#64748b;font-size:14px;margin:0;">Cheksiz kurslar, guruhlar, daraja, xona tayinlash va talaba migratsiyasi.</p></li>
        <li><h3 style="font-size:16px;margin:0 0 4px;">To'lovlar integratsiyasi</h3><p style="color:#64748b;font-size:14px;margin:0;">Click, Payme, Cash va kartalar — barcha kanallar bitta hisobotda. Avto-eslatma SMS.</p></li>
        <li><h3 style="font-size:16px;margin:0 0 4px;">Aqlli jadval</h3><p style="color:#64748b;font-size:14px;margin:0;">Avtomatik jadval, xona to'qnashuvlarini tekshirish, push va SMS eslatmalar.</p></li>
        <li><h3 style="font-size:16px;margin:0 0 4px;">Real-time hisobotlar</h3><p style="color:#64748b;font-size:14px;margin:0;">Daromad, davomat, ish haqi va konversiya. PDF/Excel eksport.</p></li>
        <li><h3 style="font-size:16px;margin:0 0 4px;">SMS va Chat</h3><p style="color:#64748b;font-size:14px;margin:0;">Ota-onalarga SMS, ichki chat, tayyor shablonlar va ommaviy yuborish.</p></li>
        <li><h3 style="font-size:16px;margin:0 0 4px;">Gamification</h3><p style="color:#64748b;font-size:14px;margin:0;">Talabalar uchun ball tizimi, daraja va mukofotlar do'koni.</p></li>
      </ul>
    </section>

    <section id="ielts" aria-labelledby="ielts-h" style="padding:64px 0;background:#0f172a;color:#fff;border-radius:16px;padding:48px;">
      <h2 id="ielts-h" style="font-size:36px;font-weight:700;text-align:center;">IELTS Mock Test platformasi</h2>
      <p style="text-align:center;color:#cbd5e1;max-width:680px;margin:8px auto 32px;">Real Cambridge formatidagi to'liq IELTS testi. AI Listening, Reading, Writing va Speaking bo'limlarini avtomatik baholaydi va batafsil feedback beradi.</p>
      <ul style="list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;">
        <li><h3 style="margin:0 0 4px;">Listening</h3><p style="color:#cbd5e1;font-size:14px;margin:0;">40 ta savol, real Cambridge formati, avtomatik audio plotlar.</p></li>
        <li><h3 style="margin:0 0 4px;">Reading</h3><p style="color:#cbd5e1;font-size:14px;margin:0;">3 ta passage, vaqt taymeri, avtomatik baholash va tushuntirish.</p></li>
        <li><h3 style="margin:0 0 4px;">Writing</h3><p style="color:#cbd5e1;font-size:14px;margin:0;">Task 1 va Task 2. AI baholash band 0.5 aniqlikda + feedback.</p></li>
        <li><h3 style="margin:0 0 4px;">Speaking</h3><p style="color:#cbd5e1;font-size:14px;margin:0;">AI suhbatdosh, ovoz tahlili, talaffuz va fluency bahosi.</p></li>
      </ul>
    </section>

    <section id="how" aria-labelledby="how-h" style="padding:64px 0;">
      <h2 id="how-h" style="font-size:32px;font-weight:700;text-align:center;">Qanday boshlash mumkin?</h2>
      <ol style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:24px;list-style:none;padding:0;margin-top:24px;">
        <li><strong style="color:#ec5b13;">01.</strong> Ro'yxatdan o'ting — 1 daqiqada akkaunt yarating.</li>
        <li><strong style="color:#ec5b13;">02.</strong> Excel orqali talabalar va guruhlarni import qiling.</li>
        <li><strong style="color:#ec5b13;">03.</strong> O'qituvchilar va administratorlarga rol bering.</li>
        <li><strong style="color:#ec5b13;">04.</strong> 2 oy bepul to'liq foydalaning.</li>
      </ol>
    </section>

    <section id="pricing" aria-labelledby="pricing-h" style="padding:64px 0;">
      <h2 id="pricing-h" style="font-size:32px;font-weight:700;text-align:center;">Sizga mos tarif</h2>
      <p style="text-align:center;color:#475569;">Barcha tariflar 2 oy bepul sinov bilan keladi.</p>
      <ul style="list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-top:24px;">
        <li><h3>Boshlang'ich</h3><p style="color:#64748b;">Kichik markazlar uchun. 100 gacha talaba, 5 ta o'qituvchi, asosiy hisobotlar, email yordam, 2 oy bepul.</p></li>
        <li><h3>Pro (Eng mashhur)</h3><p style="color:#64748b;">500 gacha talaba, cheksiz o'qituvchilar, to'lov integratsiyasi, SMS xizmati, AI yordamchi, IELTS Mock Test, 2 oy bepul.</p></li>
        <li><h3>Korxona</h3><p style="color:#64748b;">Yirik tarmoqlar uchun. Cheksiz talabalar, bir nechta filial, maxsus integratsiya, shaxsiy menedjer, SLA kafolati.</p></li>
      </ul>
    </section>

    <section id="faq" aria-labelledby="faq-h" style="padding:64px 0;max-width:760px;">
      <h2 id="faq-h" style="font-size:32px;font-weight:700;">Tez-tez beriladigan savollar</h2>
      <article><h3>Sinov muddati qanday?</h3><p style="color:#475569;">Yangi mijozlar uchun 2 oy to'liq bepul foydalanish imkoniyati. Karta yoki oldindan to'lov talab qilinmaydi.</p></article>
      <article><h3>IELTS Mock Test platformasi qanday ishlaydi?</h3><p style="color:#475569;">Talabalar real Cambridge formatidagi to'liq testni ishlaydi. AI Listening, Reading, Writing va Speaking bo'limlarini avtomatik baholaydi va band ball + batafsil feedback beradi.</p></article>
      <article><h3>Ma'lumotlarim qayerda saqlanadi?</h3><p style="color:#475569;">Sizning ma'lumotlaringiz O'zbekistondagi xavfsiz serverlarda shifrlangan holda saqlanadi. Kunlik backup va GDPR-darajasidagi himoya.</p></article>
      <article><h3>Click va Payme integratsiyasi qanday qilinadi?</h3><p style="color:#475569;">Sizning hisobingizga merchant kalitlarini biz ulaymiz, 24 soat ichida ishga tushiriladi.</p></article>
      <article><h3>Telefon ilovasi bormi?</h3><p style="color:#475569;">Ha, talabalar va o'qituvchilar uchun Android ilovasi mavjud. iOS versiyasi yaqin orada.</p></article>
    </section>

    <section id="contact" aria-labelledby="contact-h" style="padding:64px 0;background:#ec5b13;color:#fff;border-radius:16px;padding:48px;text-align:center;">
      <h2 id="contact-h" style="font-size:32px;font-weight:700;">Bugun boshlang — 2 oy bepul</h2>
      <p>Demoni oching yoki biz bilan bog'laning.</p>
      <p><strong>Telefon:</strong> <a href="tel:+998931913308" style="color:#fff;">+998 93 191-33-08</a></p>
      <p><strong>Email:</strong> <a href="mailto:dturgunboyev635@gmail.com" style="color:#fff;">dturgunboyev635@gmail.com</a></p>
      <p><strong>Manzil:</strong> Toshkent, O'zbekiston</p>
    </section>
  </main>

  <footer role="contentinfo" style="padding:32px 0;border-top:1px solid #e2e8f0;color:#64748b;font-size:14px;">
    <p>© ${new Date().getFullYear()} Eduly. Barcha huquqlar himoyalangan.</p>
    <p>Eduly — O'zbekistondagi ta'lim markazlari uchun #1 boshqaruv platformasi.</p>
  </footer>
</noscript-fallback>
`;

const html = fs.readFileSync(distHtmlPath, 'utf8');

if (html.includes('<!-- prerendered -->')) {
  console.log('[prerender] dist/index.html already prerendered, skipping.');
  process.exit(0);
}

const injected = html.replace(
  /<div id="root">\s*<\/div>/,
  `<div id="root"><!-- prerendered -->${staticSnapshot.replace(/\n\s+/g, '')}</div>`
);

if (injected === html) {
  console.error('[prerender] Could not find <div id="root"></div> in dist/index.html — nothing changed.');
  process.exit(1);
}

fs.writeFileSync(distHtmlPath, injected, 'utf8');
const sizeKb = (Buffer.byteLength(injected, 'utf8') / 1024).toFixed(1);
console.log(`[prerender] ✓ Injected SEO snapshot into dist/index.html (${sizeKb} KB)`);

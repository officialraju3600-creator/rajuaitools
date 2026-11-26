// Vercel Serverless Function — API key সার্ভারে Environment Variable-এ থাকে
const bn = 'উত্তর ব্যবহারকারীর ভাষায় দিন (বাংলায় লিখলে বাংলায়)। ';
function prompts(o) {
  return {
    chat: bn + 'আপনি একজন সহায়ক ও বন্ধুত্বপূর্ণ AI সহকারী। পরিষ্কার ও সংক্ষিপ্ত উত্তর দিন।',
    writer: bn + 'আপনি একজন দক্ষ কনটেন্ট রাইটার। ধরন: ' + (o.type || 'Blog') + '। টোন: ' + (o.tone || 'বন্ধুত্বপূর্ণ') + '। Facebook Post/Caption হলে সংক্ষিপ্ত ও আকর্ষণীয় করুন এবং উপযুক্ত ইমোজি ও হ্যাশট্যাগ দিন। Blog/Article হলে শিরোনাম (## দিয়ে), ভূমিকা, কয়েকটি অংশ ও উপসংহার দিন।',
    imageprompt: 'Convert the user idea into ONE detailed English image-generation prompt in the style: ' + (o.style || 'realistic photo') + '. Output only the prompt, max 60 words, no quotes.',
    script: bn + 'আপনি একজন ভিডিও স্ক্রিপ্ট রাইটার। প্ল্যাটফর্ম: ' + (o.platform || 'YouTube') + '। দৈর্ঘ্য: ' + (o.length || '৩ মিনিট') + '। হুক, মূল অংশ, কল-টু-অ্যাকশন আলাদা করে সময়সহ লিখুন।',
    seo: bn + 'আপনি YouTube SEO বিশেষজ্ঞ। দিন: ## Title (৫টি অপশন), ## Description (প্রথম ২ লাইনে মূল কিওয়ার্ড), ## Tags (কমা দিয়ে ১৫টি), ## Keywords (বাংলা ও ইংরেজি)।',
    translate: 'Translate the user text into ' + (o.to || 'English') + '. Output only the translation, nothing else.',
    cv: bn + 'আপনি পেশাদার CV রাইটার। ভাষা: ' + (o.lang || 'English') + '। ব্যবহারকারীর তথ্য থেকে পরিষ্কার CV লিখুন: ## দিয়ে সেকশন (Summary, Experience, Education, Skills), তালিকা - দিয়ে। কোনো তথ্য বানাবেন না; যা দেওয়া হয়নি তা বাদ দিন।'
  };
}
module.exports = async (req, res) => {
  const fail = (c, m) => res.status(c).json({ error: m });
  if (req.method !== 'POST') return fail(405, 'POST দরকার');
  const b = req.body || {};
  const text = String(b.input || '').trim();
  const o = b.opts || {};
  const S = prompts(o);
  if (!S[b.tool]) return fail(400, 'অজানা টুল');
  if (!text || text.length > 4000) return fail(400, 'লেখা খালি বা অনেক বড় (সর্বোচ্চ ৪০০০ অক্ষর)');
  const key = process.env.GEMINI_KEY;
  if (!key) return fail(500, 'সার্ভারে GEMINI_KEY সেট করা নেই');
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const msgs = [];
  if (b.tool === 'chat' && Array.isArray(b.history))
    b.history.slice(-10).forEach(h => { if (h && h.t) msgs.push({ role: h.r === 'ai' ? 'model' : 'user', parts: [{ text: String(h.t).slice(0, 2000) }] }); });
  msgs.push({ role: 'user', parts: [{ text }] });
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: S[b.tool] }] }, contents: msgs, generationConfig: { maxOutputTokens: 2000 } })
    });
    const d = await r.json();
    const out = d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts[0].text;
    if (!out) return fail(502, 'AI উত্তর দেয়নি। GEMINI_KEY ও মডেলের নাম ঠিক আছে কিনা দেখুন।');
    res.status(200).json({ text: out });
  } catch (e) { fail(502, 'AI সার্ভারে সংযোগ হয়নি'); }
};

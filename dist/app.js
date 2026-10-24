(() => {
  'use strict';
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
  const escape = (value) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('js');

  // Reveals are progressive enhancement; content stays visible without JS.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.06 });
    $$('.reveal').forEach(element => observer.observe(element));
  } else $$('.reveal').forEach(element => element.classList.add('visible'));

  const menu = $('.menu-toggle');
  const nav = $('#main-nav');
  function closeMenu() { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'Open navigation'); }
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open)); menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation'); nav.classList.toggle('open', open);
  });
  $$('a', nav).forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
  document.addEventListener('click', event => { if (!event.target.closest('.site-header')) closeMenu(); });

  // The creator strip moves only through dragging, swiping or keyboard input.
  const reelTrack = $('.reel-track');
  const originalReelCards = [...reelTrack.children];
  const copyReelCards = () => originalReelCards.map(card => {
    const copy = card.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    return copy;
  });
  reelTrack.prepend(...copyReelCards());
  reelTrack.append(...copyReelCards());
  let reelDrag = null;
  let reelLoopWidth = 0;
  function measureReelLoop() {
    const width = originalReelCards[0].offsetLeft - reelTrack.children[0].offsetLeft;
    if (!width) return;
    const progress = reelLoopWidth ? ((reelTrack.scrollLeft - reelLoopWidth) / reelLoopWidth) : 0;
    reelLoopWidth = width;
    reelTrack.scrollLeft = width * (1 + ((progress % 1) + 1) % 1);
    stopReelDrag();
  }
  function wrapReelScroll() {
    if (!reelLoopWidth) return;
    const left = reelTrack.scrollLeft;
    // Return to the identical middle set before reaching either physical end.
    const shift = left < reelLoopWidth * .5 ? reelLoopWidth : left > reelLoopWidth * 1.5 ? -reelLoopWidth : 0;
    if (shift) {
      reelTrack.scrollLeft = left + shift;
      if (reelDrag) reelDrag.left += shift;
    }
  }
  reelTrack.addEventListener('scroll', wrapReelScroll, {passive:true});
  if ('ResizeObserver' in window) new ResizeObserver(measureReelLoop).observe(reelTrack);
  else window.addEventListener('resize', measureReelLoop);
  measureReelLoop();
  reelTrack.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    event.preventDefault();
    reelTrack.focus({preventScroll:true});
    reelDrag = {id:event.pointerId, x:event.clientX, left:reelTrack.scrollLeft};
    reelTrack.setPointerCapture(event.pointerId);
  });
  reelTrack.addEventListener('pointermove', event => {
    if (!reelDrag || event.pointerId !== reelDrag.id) return;
    const distance = event.clientX - reelDrag.x;
    if (Math.abs(distance) > 4) reelTrack.classList.add('is-dragging');
    reelTrack.scrollLeft = reelDrag.left - distance;
    wrapReelScroll();
  });
  function stopReelDrag() { reelDrag = null; reelTrack.classList.remove('is-dragging'); }
  reelTrack.addEventListener('pointerup', stopReelDrag);
  reelTrack.addEventListener('pointercancel', stopReelDrag);
  reelTrack.addEventListener('lostpointercapture', stopReelDrag);
  reelTrack.addEventListener('keydown', event => {
    if (event.target !== reelTrack) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      reelTrack.scrollBy({left:(event.key === 'ArrowRight' ? 1 : -1)*reelTrack.clientWidth*.65, behavior:reduceMotion?'instant':'smooth'});
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      reelTrack.scrollTo({left:event.key === 'Home'?reelLoopWidth:reelLoopWidth * 2 - reelTrack.clientWidth, behavior:reduceMotion?'instant':'smooth'});
    }
  });
  $$('img',reelTrack).forEach(img => img.draggable = false);

  // Video playback remains independent of the scrolling cards.
  const reelButton = $('#reel-play');
  const reels = $$('.reel-card video');
  let reelsPlaying = false;
  async function playReel(video) {
    try { await video.play(); return true; } catch { return false; }
  }
  reelButton.addEventListener('click', async () => {
    if (reelsPlaying) {
      reels.forEach(video => video.pause()); reelsPlaying = false;
    } else {
      const result = await Promise.all(reels.map(playReel));
      reelsPlaying = result.some(Boolean);
      if (!reelsPlaying) toast('Playback is unavailable here. You can still explore the campaign gallery below.');
    }
    reelButton.setAttribute('aria-pressed', String(reelsPlaying));
    reelButton.innerHTML = reelsPlaying ? 'PAUSE THE REELS <span>Ⅱ</span>' : 'PLAY THE REELS <span>▶</span>';
  });
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion) {
    reels.forEach(video => {
      video.closest('.reel-card').addEventListener('pointerenter',()=>playReel(video));
      video.closest('.reel-card').addEventListener('pointerleave',()=>{if(!reelsPlaying)video.pause();});
    });
  }
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){reels.forEach(video=>video.pause());reelsPlaying=false;reelButton.setAttribute('aria-pressed','false');reelButton.innerHTML='PLAY THE REELS <span>▶</span>';}
  });

  // A large testimonial carousel keeps each partner's words readable.
  const quotes = $$('.quote-card');
  let quoteIndex = 0;
  function selectQuote(index) {
    quoteIndex = (index + quotes.length) % quotes.length;
    quotes.forEach((quote,i) => { quote.hidden = i !== quoteIndex; });
    $('#quote-count').textContent = `${String(quoteIndex+1).padStart(2,'0')} / ${String(quotes.length).padStart(2,'0')}`;
  }
  $('#quote-prev').addEventListener('click',()=>selectQuote(quoteIndex-1));
  $('#quote-next').addEventListener('click',()=>selectQuote(quoteIndex+1));
  selectQuote(0);

  // One-page enquiry validates and opens an email draft without a review step.
  const form = $('#brief-form');
  const fields = $('#step-fields');
  const error = $('#form-error');
  const answers = { name:'', email:'', phone:'', budget:'', platforms:[] };
  const budgetInput = $('#banner-budget');
  const budgetSlider = $('#enquiry-budget-slider');
  const budgetDisplay = $('#enquiry-budget-display');
  const platformInputs = $$('[name=platforms]',fields);
  const allPlatforms = $('#platform-all');
  function clearError() {
    error.textContent = '';
    $$('[aria-invalid]',fields).forEach(input=>input.removeAttribute('aria-invalid'));
  }
  const rupees = value => new Intl.NumberFormat('en-IN',{maximumFractionDigits:0}).format(value);
  function budgetNumber() {
    const value=budgetInput.value.replace(/,/g,'').trim();
    return /^\d+$/.test(value)?Number(value):NaN;
  }
  function budgetLabel(value) {
    if(value>=10000000)return `₹${Number((value/10000000).toFixed(2))} crore`;
    if(value>=100000)return `₹${Number((value/100000).toFixed(2))} lakh`;
    return `₹${rupees(value)}`;
  }
  function setBudget(value,format=true) {
    const position=Math.max(0,Math.min(100,Math.log(Math.max(value,10000)/10000)/Math.log(500)*100));
    budgetSlider.value=String(Math.round(position));
    budgetSlider.style.setProperty('--budget-fill',`${budgetSlider.value}%`);
    budgetSlider.setAttribute('aria-valuetext',budgetLabel(value)+(value>5000000?' — custom amount':''));
    budgetDisplay.textContent=budgetLabel(value);
    if(format)budgetInput.value=rupees(value);
  }
  budgetSlider.addEventListener('input',()=>{
    const amount=Math.round(10000*Math.pow(500,Number(budgetSlider.value)/100)/5000)*5000;
    setBudget(amount);clearError();
  });
  budgetInput.addEventListener('input',()=>{
    const amount=budgetNumber();
    if(Number.isSafeInteger(amount)&&amount>0)setBudget(amount,false);
    else budgetDisplay.textContent='Choose your budget';
  });
  budgetInput.addEventListener('blur',()=>{const amount=budgetNumber();if(Number.isSafeInteger(amount)&&amount>0)setBudget(amount);});
  setBudget(budgetNumber());
  function syncAllPlatforms() {
    const count=platformInputs.filter(input=>input.checked).length;
    allPlatforms.checked=count===platformInputs.length;
    allPlatforms.indeterminate=count>0&&count<platformInputs.length;
  }
  allPlatforms.addEventListener('change',()=>{platformInputs.forEach(input=>{input.checked=allPlatforms.checked;});syncAllPlatforms();});
  platformInputs.forEach(input=>input.addEventListener('change',syncAllPlatforms));
  function collectAnswers() {
    ['name','email','phone'].forEach(name=>{answers[name]=$(`[name=${name}]`,fields).value.trim();});
    answers.budget=Number.isSafeInteger(budgetNumber())?'₹'+rupees(budgetNumber()):'';
    answers.platforms=platformInputs.filter(input=>input.checked).map(input=>input.value);
  }
  function invalid(message,input) {
    error.textContent=message;
    if(input){input.setAttribute('aria-invalid','true');input.focus({preventScroll:true});}
    return false;
  }
  function validate() {
    collectAnswers();clearError();
    if(answers.name.length<2)return invalid('Please enter your full name (at least 2 characters).',$('[name=name]',fields));
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.email))return invalid('Please enter a valid business email.',$('[name=email]',fields));
    if(!/^[+\d\s()\-]{7,25}$/.test(answers.phone)||answers.phone.replace(/\D/g,'').length<7)return invalid('Please enter a valid phone number.',$('[name=phone]',fields));
    if(!Number.isSafeInteger(budgetNumber())||budgetNumber()<10000)return invalid('Please enter a budget of at least ₹10,000 (numbers only).',budgetInput);
    if(!answers.platforms.length)return invalid('Please select at least one social platform.',platformInputs[0]);
    return true;
  }
  function enquiryText() {
    return `INFLUENCERACT — CAMPAIGN CALL ENQUIRY\n\nName: ${answers.name}\nBusiness email: ${answers.email}\nPhone: ${answers.phone}\nWorking campaign budget: ${answers.budget}\nSocial platforms: ${answers.platforms.join(', ')}\n\nHello InfluencerAct,\nI would like to arrange a call about a creator campaign. Please contact me to discuss the brief, suitable creators, scope and next steps.\n\nThis is an enquiry to arrange a conversation. Budget and campaign scope are subject to discussion.`;
  }
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if(!validate())return;
    const draft=document.createElement('a');
    draft.href=`mailto:contactus@influenceract.com?subject=${encodeURIComponent('Campaign call enquiry — '+answers.name)}&body=${encodeURIComponent(enquiryText())}`;
    document.body.append(draft);draft.click();draft.remove();
    toast('Your email app will open a draft for you to send.');
  });
  fields.addEventListener('input',clearError);fields.addEventListener('change',clearError);
  $$('a[href="#campaign-form"]').forEach(link=>link.addEventListener('click',()=>{
    closeMenu();setTimeout(()=>{$('[name=name]',fields)?.focus({preventScroll:true});},reduceMotion?0:450);
  }));

  // Repeat the portrait gallery around its original set for manual infinite scrolling.
  const rail = $('#creator-rail');
  const creatorCards = [...rail.children];
  creatorCards.forEach((card,index)=>{card.dataset.creatorIndex=String(index);});
  const cloneCreators = () => creatorCards.map(card=>{
    const copy=card.cloneNode(true);
    copy.setAttribute('aria-hidden','true');
    copy.tabIndex=-1;
    return copy;
  });
  rail.prepend(...cloneCreators());
  rail.append(...cloneCreators());
  let drag = null;
  let creatorLoopWidth = 0;
  let creatorScrollFrame = 0;
  function wrapCreators() {
    if(!creatorLoopWidth)return;
    const left=rail.scrollLeft;
    const shift=left<creatorLoopWidth*.5?creatorLoopWidth:left>creatorLoopWidth*1.5?-creatorLoopWidth:0;
    if(shift){rail.scrollLeft=left+shift;if(drag)drag.scroll+=shift;}
  }
  function measureCreators() {
    const width=creatorCards[0].offsetLeft-rail.children[0].offsetLeft;
    if(!width)return;
    const progress=creatorLoopWidth?(rail.scrollLeft-creatorLoopWidth)/creatorLoopWidth:0;
    creatorLoopWidth=width;
    rail.scrollLeft=width*(1+((progress%1)+1)%1);
  }
  rail.addEventListener('scroll',wrapCreators,{passive:true});
  if('ResizeObserver' in window)new ResizeObserver(measureCreators).observe(rail);
  else window.addEventListener('resize',measureCreators);
  measureCreators();
  function scrollRail(direction) {
    cancelAnimationFrame(creatorScrollFrame);
    const distance=direction*rail.clientWidth*.72;
    if(reduceMotion){rail.scrollLeft+=distance;wrapCreators();return;}
    let start=null,previous=0;
    function step(time){
      if(start===null)start=time;
      const progress=Math.min((time-start)/320,1);
      const travelled=distance*(1-Math.pow(1-progress,3));
      rail.scrollLeft+=travelled-previous;previous=travelled;wrapCreators();
      if(progress<1)creatorScrollFrame=requestAnimationFrame(step);
    }
    creatorScrollFrame=requestAnimationFrame(step);
  }
  $('#creators-prev').addEventListener('click',()=>scrollRail(-1));
  $('#creators-next').addEventListener('click',()=>scrollRail(1));
  rail.addEventListener('keydown',event=>{if(event.target!==rail)return;if(event.key==='ArrowRight'){event.preventDefault();scrollRail(1);}if(event.key==='ArrowLeft'){event.preventDefault();scrollRail(-1);}});
  rail.addEventListener('pointerdown',event=>{
    if(event.pointerType!=='mouse'||event.button!==0)return;
    cancelAnimationFrame(creatorScrollFrame);
    drag={id:event.pointerId,x:event.clientX,scroll:rail.scrollLeft,moved:false};
  });
  rail.addEventListener('pointermove',event=>{
    if(!drag||drag.id!==event.pointerId)return;
    const distance=event.clientX-drag.x;
    if(Math.abs(distance)>8){
      if(!drag.moved)rail.setPointerCapture(event.pointerId);
      drag.moved=true;rail.scrollLeft=drag.scroll-distance;rail.style.cursor='grabbing';wrapCreators();
    }
  });
  rail.addEventListener('click',event=>{if(drag?.moved){event.preventDefault();event.stopPropagation();}},true);
  function endCreatorDrag(){if(!drag)return;setTimeout(()=>{drag=null;rail.style.cursor='';},0);}
  rail.addEventListener('pointercancel',endCreatorDrag);
  rail.addEventListener('lostpointercapture',endCreatorDrag);
  window.addEventListener('pointerup',endCreatorDrag);
  $$('img',rail).forEach(img=>img.draggable=false);

  $$('.creator-card').forEach((card,index)=>card.addEventListener('click',event=>{
    if(drag?.moved)return;
    event.preventDefault();
    const name=$('h3',card).textContent;
    const image=$('img',card).getAttribute('src');
    const tier=Number(card.dataset.creatorIndex)<2?'Micro creator':'Macro creator';
    openDialog(`<img class="dialog-cover" src="${escape(image)}" alt="${escape(name)}"><div class="dialog-inner"><span class="eyebrow">${tier.toUpperCase()} / THE INFLUENCERACT NETWORK</span><h2 id="dialog-title">${escape(name)}</h2><p>One of the distinct voices in the InfluencerAct creator network. The right collaboration starts with audience fit, a shared direction and a good brief.</p><a class="button dark" href="#campaign-form">Build a creator brief <span>↗</span></a><p class="dialog-footer-note"><a href="https://www.influenceract.com/creators.html" target="_blank" rel="noopener">Explore the full creator network ↗</a></p></div>`);
  }));

  // Budget ranges describe a planning approach, never a guaranteed quote.
  const budgetIdeas = [
    [
        "Under ₹2 Lakhs",
        "Start Focused. Learn Fast.",
        "Build a lean campaign with carefully selected creators, focused deliverables and a clear objective. Ideal for testing content ideas, niche audiences or product messaging."
    ],
    [
        "Between ₹2–5 Lakhs",
        "Find Your First Growth Signals.",
        "Combine relevant creators and platform-native content to build awareness, encourage engagement and understand which stories resonate with your audience."
    ],
    [
        "Between ₹5–10 Lakhs",
        "Build Momentum Across Creators.",
        "Bring multiple creators into a coordinated campaign with varied content formats, stronger audience coverage and performance tracking to identify what works."
    ],
    [
        "Between ₹10–25 Lakhs",
        "Scale Your Campaign With Intent.",
        "Develop a broader creator mix, run coordinated activations across platforms and use campaign insights to refine creative direction and improve outcomes."
    ],
    [
        "Above ₹25 Lakhs",
        "Make Influence Work At Premium.",
        "Plan an integrated creator programme with wider reach, multiple content formats, potential paid amplification and structured measurement aligned with your business goals."
    ]
];
  const range = $('#budget-range');
  function updateBudget(){const idea=budgetIdeas[range.value];$('#budget-output').textContent=idea[0];$('#budget-type').textContent=idea[1];$('#budget-description').textContent=idea[2];range.setAttribute('aria-valuetext',idea[0]);}
  range.addEventListener('input',updateBudget); updateBudget();
  $('#use-budget').addEventListener('click',()=>{setBudget([100000,350000,750000,1750000,3000000][range.value]);clearError();toast('Your planning budget has been added to the enquiry.');});

  const dialog = $('#detail-dialog');
  let lastFocus = null;
  function openDialog(html,kind='') {
    lastFocus = document.activeElement; $('#dialog-content').innerHTML = html; dialog.className=kind; dialog.showModal(); dialog.scrollTop=0; document.body.classList.add('dialog-open'); $('.dialog-close').focus();
  }
  function closeDialog(){dialog.close();}
  $('.dialog-close').addEventListener('click',closeDialog);
  dialog.addEventListener('click',event=>{const box=dialog.getBoundingClientRect();if(event.target===dialog&&(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom))closeDialog();});
  dialog.addEventListener('close',()=>{document.body.classList.remove('dialog-open');lastFocus?.focus({preventScroll:true});});
  $('#dialog-content').addEventListener('click',event=>{if(event.target.closest('a[href="#campaign-form"]'))closeDialog();});
  const services={
    strategy:{title:"Creator Strategy",label:"01 START WITH THE RIGHT PEOPLE",text:"We start with your audience, ambition and category, then find creators whose voice, community and content make sense for the brief.",points:['Audience and category understanding','Creator discovery and audience-fit checks','Campaign objectives, platform mix and creative direction']},
    content:{title:"Content & Collaboration",label:"02 GIVE YOUR IDEA A VOICE",text:"We turn campaign direction into creator-first stories that feel native to the platform and true to the person making them.",points:['Platform-native Reels, Stories and video','UGC and creator-led product storytelling','Focused creative briefs and brand collaborations']},
    campaign:{title:"Campaign Management",label:"03 KEEP EVERY DETAIL IN STEP",text:"From outreach and timelines to content reviews and publishing, we keep the moving parts connected.",points:['Creator communication and campaign coordination','Content development, feedback and approval planning','Publishing schedules and ongoing campaign monitoring']},
    performance:{title:"Performance & Growth",label:"04 LEARN FROM WHAT LANDS",text:"We look beyond the view count to understand what caught attention, earned a response and encouraged action.",points:['Campaign measures agreed around your goals','Reach, engagement, tracked clicks and conversion reporting','Learning, optimisation and paid amplification opportunities']}
  };
  $$('[data-service]').forEach(card=>card.addEventListener('click',()=>{const data=services[card.dataset.service];openDialog(`<div class="dialog-service-symbol" aria-hidden="true">✳</div><div class="dialog-inner"><span class="eyebrow">${data.label}</span><h2 id="dialog-title">${data.title}</h2><p>${data.text}</p><ul>${data.points.map(p=>`<li>${p}</li>`).join('')}</ul><a class="button dark" href="#campaign-form">Let’s shape your brief <span>↗</span></a></div>`);}));
  const awards={
    brand:{title:'Brand Storyz 2025',body:'afaqs! · 13 November 2025',image:'event-brand-storyz-2025.webp',text:'Gold and Bronze recognition for the Policy Bazaar term and health insurance campaign.',points:['Gold — BFSI','Bronze — Best Use of Data & Insights'],place:'Aloft, Aerocity, New Delhi'},
    next:{title:'BW Next Gen Digi Content',body:'BUSINESSWORLD · 17 December 2025',image:'event-bw-next-gen-2025.webp',text:'Recognition across finance content, regional collaboration and agency excellence.',points:['Gold — Excellence in Finance Content Marketing','Silver — Best Regional Influencer Collaboration','Silver — Influencer Marketing Agency of the Year'],place:'Eros Hotel, New Delhi'},
    merit:{title:'BW Merit Awards 2026',body:'BUSINESSWORLD · 18 June 2026',image:'event-bw-merit-2026.webp',text:'A collection of honours across segmentation, experiential marketing, regional storytelling and viral influence.',points:['Gold — Best Use of Segmentation','Silver — Best Use of Experiential Marketing','Silver — Best Viral Influencer Campaign','Bronze — Regional Marketing Campaign'],place:'Novotel Mumbai'},
    impact:{title:'IMPACT Digital Influencer',body:'EXCHANGE4MEDIA · 15 April 2026',image:'event-impact-digital-influencer.webp',text:'Honours for inclusive collaborations, regional content and storytelling that puts people at the centre.',points:['Silver — Best Influencer Collaboration for Diversity and Inclusion','Bronze — Best Regional Content','Bronze — Best Brand Storytelling via Influencers'],place:'Taj Santacruz, Mumbai'},
    gold:{title:'ICMA Awards — Gold',body:'EXCHANGE4MEDIA · 17 December 2025',image:'event-icma-2025-gold.webp',text:'Gold recognition for creator work that made the most of YouTube as a campaign platform.',points:['Gold — Best Use of YouTube for a Campaign'],place:'Novotel Hotel, Mumbai'},
    silver:{title:'ICMA Awards — Silver',body:'EXCHANGE4MEDIA · 17 December 2025',image:'event-icma-2025-silver.webp',text:'Silver recognition for long-form digital content and video storytelling.',points:['Silver — Best Use of Digital Content Long Form Video'],place:'Novotel Hotel, Mumbai'}
  };
  $$('[data-award]').forEach(card=>card.addEventListener('click',()=>{const data=awards[card.dataset.award];openDialog(`<img class="dialog-cover" src="assets/${data.image}" alt="InfluencerAct team at ${escape(data.title)}"><div class="dialog-inner"><span class="eyebrow">${data.body}</span><h2 id="dialog-title">${data.title}</h2><p>${data.text}</p><ul>${data.points.map(p=>`<li>${p}</li>`).join('')}</ul><p class="dialog-footer-note">${data.place} · From the InfluencerAct recognition archive.</p></div>`,'award-detail');}));

  // Close other FAQ answers without changing the visitor's scroll position.
  $$('.faq-list details').forEach(item=>item.addEventListener('toggle',()=>{if(item.open)$$('.faq-list details').forEach(other=>{if(other!==item)other.open=false;});}));
  let toastTimer;
  function toast(message){clearTimeout(toastTimer);const element=$('#toast');element.textContent=message;element.classList.add('visible');toastTimer=setTimeout(()=>element.classList.remove('visible'),3500);}
})();

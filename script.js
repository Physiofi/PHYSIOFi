const CONTACT = {
  phones: [
    { display: "+91 70341 01880", e164: "+917034101880" },
    { display: "+91 75618 45481", e164: "+917561845481" },
    { display: "+91 86064 28704", e164: "+918606428704" },
  ],
  whatsappE164: "917034101880",
  email: "physiofi25@gmail.com",
};

const FORM_DELIVERY = {
  // Google Apps Script Web App URL for sheet + email notifications.
  endpoint:
    "https://script.google.com/macros/s/AKfycbzVLN4G6WGAqYmyGJGdptu9RE_JPcLGD9Z36WCn7uV9_-_ccmDuJ8fFRxw_cV-AcIceCw/exec",
};

const SOCIAL_LINKS = {
  youtube: "https://youtube.com/@physiofi?si=Ii4dWPibYzNmULdH",
  facebook: "https://www.facebook.com/share/17vu5m6gzZ/",
  instagram: "https://www.instagram.com/physiofi_/?hl=en",
};

const CLICKWRAP_ACCEPTED_KEY = "physiofi_clickwrap_accepted_v1";

function qs(sel) {
  return document.querySelector(sel);
}

function onlyDigits(s) {
  return (s || "").replace(/[^\d]/g, "");
}

function buildWhatsAppUrl({ whatsappE164, prefillText }) {
  const phone = onlyDigits(whatsappE164);
  const text = encodeURIComponent(prefillText || "Hi, I need help.");
  return `https://wa.me/${phone}?text=${text}`;
}

function buildMailtoUrl({ email, subject, body }) {
  const s = encodeURIComponent(subject || "Help request");
  const b = encodeURIComponent(body || "");
  return `mailto:${email}?subject=${s}&body=${b}`;
}

function buildGmailComposeUrl({ email, subject, body }) {
  const to = encodeURIComponent(email || "");
  const su = encodeURIComponent(subject || "Help request");
  const bd = encodeURIComponent(body || "");
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${bd}`;
}

function setHref(id, href) {
  const el = document.getElementById(id);
  if (!el) return;
  el.setAttribute("href", href);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
}

function renderPhoneLinks(containerId, className = "") {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  CONTACT.phones.forEach((phone) => {
    const link = document.createElement("a");
    link.href = `tel:${phone.e164}`;
    link.textContent = phone.display;
    link.className = className;
    container.appendChild(link);
  });
}

function showToast(form, message, { isError = false } = {}) {
  const toast = form.querySelector(".toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.toggle("is-error", isError);
  toast.classList.add("is-visible");
  document.body.classList.add("no-scroll");
  window.clearTimeout(toast._timer);
  toast._timer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
    document.body.classList.remove("no-scroll");
  }, 3800);
}

function validateMobile(value) {
  const digits = onlyDigits(value);
  if (digits.length < 10) return "Mobile number must be at least 10 digits.";
  if (digits.length > 15) return "Mobile number looks too long.";
  return "";
}

function setFieldError(form, fieldId, message) {
  const errorEl = form.querySelector(`[data-error-for="${fieldId}"]`);
  if (!errorEl) return;
  errorEl.textContent = message || "";
}

function askForClickwrapConsent() {
  const overlay = qs("#clickwrapModal");
  const acceptBtn = qs("#clickwrapAccept");
  const cancelBtn = qs("#clickwrapCancel");

  if (!overlay || !acceptBtn || !cancelBtn) {
    // Fail closed: do not submit if consent UI is unavailable.
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const previouslyFocused = document.activeElement;

    function cleanup(consented) {
      overlay.hidden = true;
      overlay.removeEventListener("click", onOverlayClick);
      document.removeEventListener("keydown", onKeyDown);
      acceptBtn.removeEventListener("click", onAccept);
      cancelBtn.removeEventListener("click", onCancel);
      if (previouslyFocused && previouslyFocused.focus) {
        previouslyFocused.focus();
      }
      resolve(consented);
    }

    function onAccept() {
      cleanup(true);
    }

    function onCancel() {
      cleanup(false);
    }

    function onOverlayClick(e) {
      if (e.target === overlay) {
        cleanup(false);
      }
    }

    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        cleanup(false);
      }
    }

    overlay.hidden = false;
    acceptBtn.focus();

    overlay.addEventListener("click", onOverlayClick);
    document.addEventListener("keydown", onKeyDown);
    acceptBtn.addEventListener("click", onAccept);
    cancelBtn.addEventListener("click", onCancel);
  });
}

function hasAcceptedClickwrap() {
  try {
    return localStorage.getItem(CLICKWRAP_ACCEPTED_KEY) === "true";
  } catch {
    return false;
  }
}

function markClickwrapAccepted() {
  try {
    localStorage.setItem(CLICKWRAP_ACCEPTED_KEY, "true");
  } catch {
    // Ignore storage errors (private mode, blocked storage, etc.)
  }
}

async function initClickwrapOnFirstVisit() {
  if (hasAcceptedClickwrap()) return;
  const consented = await askForClickwrapConsent();
  if (consented) {
    markClickwrapAccepted();
  }
}

function validateForm(form) {
  const name = form.elements.namedItem("name");
  const mobile = form.elements.namedItem("mobile");
  const email = form.elements.namedItem("email");
  const problem = form.elements.namedItem("problem");

  let ok = true;

  if (!name.value || name.value.trim().length < 2) {
    setFieldError(form, "name", "Please enter your name (at least 2 characters).");
    ok = false;
  } else {
    setFieldError(form, "name", "");
  }

  const mobileMsg = validateMobile(mobile.value);
  if (mobileMsg) {
    setFieldError(form, "mobile", mobileMsg);
    ok = false;
  } else {
    setFieldError(form, "mobile", "");
  }

  if (!email.value || !email.checkValidity()) {
    setFieldError(form, "email", "Please enter a valid email address.");
    ok = false;
  } else {
    setFieldError(form, "email", "");
  }

  if (!problem.value || problem.value.trim().length < 10) {
    setFieldError(form, "problem", "Please describe your problem (min 10 chars).");
    ok = false;
  } else {
    setFieldError(form, "problem", "");
  }

  return ok;
}

function getPayloadSummary(payload) {
  return [
    `Name: ${payload.name || ""}`,
    `Mobile: ${payload.mobile || ""}`,
    `Email: ${payload.email || ""}`,
    "",
    "Problem:",
    payload.problem || "",
  ].join("\n");
}

function getFormPayload(form) {
  return {
    submittedAt: new Date().toISOString(),
    name: form.elements.namedItem("name").value.trim(),
    mobile: form.elements.namedItem("mobile").value.trim(),
    email: form.elements.namedItem("email").value.trim(),
    problem: form.elements.namedItem("problem").value.trim(),
  };
}

async function submitToEndpoint(payload) {
  if (!FORM_DELIVERY.endpoint) {
    return { ok: false, reason: "missing-endpoint" };
  }

  const body = {
    name: payload.name,
    mobile: payload.mobile,
    email: payload.email,
    problem: payload.problem,
    message: getPayloadSummary(payload),
    submittedAt: payload.submittedAt,
    _replyto: payload.email,
    subject: "New help request (from website)",
  };

  // URL-encoded body is most compatible with Google Apps Script doPost(e).
  const encoded = new URLSearchParams(body);

  const response = await fetch(FORM_DELIVERY.endpoint, {
    method: "POST",
    body: encoded,
  });

  if (!response.ok) {
    return { ok: false, reason: `http-${response.status}` };
  }

  return { ok: true };
}

function initContactLinks() {
  setText("year", new Date().getFullYear());

  setText("emailText", CONTACT.email);
  setText("footerEmailText", CONTACT.email);

  const primaryPhone = CONTACT.phones[0]?.e164 || "";
  const tel = primaryPhone ? `tel:${primaryPhone}` : "#";
  const wa = buildWhatsAppUrl({
    whatsappE164: CONTACT.whatsappE164,
    prefillText: "Hi, I need help.",
  });
  const mail = buildMailtoUrl({
    email: CONTACT.email,
    subject: "Help request",
    body: "Hi,\n\nI need help with...",
  });
  const gmailCompose = buildGmailComposeUrl({
    email: CONTACT.email,
    subject: "Help request",
    body: "Hi,\n\nI need help with...",
  });

  setHref("callLink", tel);

  setHref("whatsAppLink", wa);
  setHref("waCard", wa);

  setHref("emailLink", gmailCompose);
  setHref("mailCard", gmailCompose);
  setHref("footerEmailLink", gmailCompose);

  setHref("footerYouTube", SOCIAL_LINKS.youtube);
  setHref("footerFacebook", SOCIAL_LINKS.facebook);
  setHref("footerInstagram", SOCIAL_LINKS.instagram);

  renderPhoneLinks("phoneList", "phone-link");
  renderPhoneLinks("footerPhoneList", "footer__contact mono");

  const emailLink = document.getElementById("emailLink");
  if (emailLink) {
    emailLink.addEventListener("click", (e) => {
      const href = emailLink.getAttribute("href") || "";
      if (!href.startsWith("https://mail.google.com/mail/")) {
        e.preventDefault();
        const fallback = buildGmailComposeUrl({
          email: CONTACT.email,
          subject: "Help request",
          body: "Hi,\n\nI need help with...",
        });
        window.location.href = fallback;
      }
    });
  }
}

function initNavPhoneMenu() {
  const trigger = qs("#callLink");
  const menu = qs("#navPhoneMenu");
  if (!trigger || !menu) return;

  menu.innerHTML = "";
  CONTACT.phones.forEach((phone) => {
    const link = document.createElement("a");
    link.href = `tel:${phone.e164}`;
    link.textContent = phone.display;
    link.className = "phone-menu__item mono";
    menu.appendChild(link);
  });

  let hideTimer = null;

  function openMenu() {
    window.clearTimeout(hideTimer);
    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
  }

  function closeMenu() {
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  }

  function scheduleClose() {
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(closeMenu, 120);
  }

  trigger.addEventListener("click", (e) => {
    e.preventDefault();
    if (menu.hidden) {
      openMenu();
      return;
    }
    closeMenu();
  });

  trigger.addEventListener("mouseenter", openMenu);
  trigger.addEventListener("mouseleave", scheduleClose);
  menu.addEventListener("mouseenter", openMenu);
  menu.addEventListener("mouseleave", scheduleClose);

  document.addEventListener("click", (e) => {
    if (!menu.hidden && !menu.contains(e.target) && !trigger.contains(e.target)) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMenu();
    }
  });
}

function wireForm(form) {
  const submitBtn = form.querySelector('button[type="submit"]');
  if (!submitBtn) return;
  let suppressResetToast = false;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const ok = validateForm(form);
    if (!ok) {
      showToast(form, "Please fix the highlighted fields.", { isError: true });
      return;
    }

    let consented = hasAcceptedClickwrap();
    if (!consented) {
      consented = await askForClickwrapConsent();
      if (consented) {
        markClickwrapAccepted();
      }
    }
    if (!consented) {
      showToast(form, "You must accept consent to continue.", { isError: true });
      return;
    }

    const payload = getFormPayload(form);
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    try {
      const result = await submitToEndpoint(payload);
      if (!result.ok) {
        showToast(
          form,
          "Submission failed. Please try again or contact us directly.",
          { isError: true }
        );
        return;
      }

      showToast(form, "Form submitted successfully.");
      window.alert("Form submitted successfully.");
      suppressResetToast = true;
      form.reset();
    } catch (err) {
      showToast(form, "Network error while submitting. Please try again.", {
        isError: true,
      });
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit";
    }
  });

  form.addEventListener("reset", () => {
    setFieldError(form, "name", "");
    setFieldError(form, "mobile", "");
    setFieldError(form, "email", "");
    setFieldError(form, "problem", "");
    if (suppressResetToast) {
      suppressResetToast = false;
      return;
    }
    showToast(form, "Cleared.");
  });
}

function initForm() {
  const forms = document.querySelectorAll(".js-help-form");
  forms.forEach((form) => wireForm(form));
}

function initBookingModal() {
  const openBtn = qs("#bookAppointmentBtn");
  const modal = qs("#bookingModal");
  const closeBtn = qs("#bookingModalClose");
  const form = qs("#helpFormModal");
  if (!openBtn || !modal || !closeBtn || !form) return;

  let previouslyFocused = null;

  function openModal() {
    previouslyFocused = document.activeElement;
    modal.hidden = false;
    document.body.classList.add("is-booking-open");
    const firstField = form.elements.namedItem("name");
    if (firstField && firstField.focus) {
      firstField.focus();
    }
    document.addEventListener("keydown", onKeyDown);
  }

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove("is-booking-open");
    document.removeEventListener("keydown", onKeyDown);
    if (previouslyFocused && previouslyFocused.focus) {
      previouslyFocused.focus();
    }
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeModal();
    }
  }

  openBtn.addEventListener("click", (e) => {
    e.preventDefault();
    openModal();
  });

  closeBtn.addEventListener("click", closeModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
}

const eventGallerySlides = Array.from(document.querySelectorAll('#event-gallery .slide'));
const eventGalleryDots = Array.from(document.querySelectorAll('#event-gallery .carousel-dot'));
const eventSidePoster = document.querySelector('#event-gallery .side-poster');
const eventCloseButton = document.querySelector('#event-gallery .close-side-poster');
const eventPrevButton = document.querySelector('#event-gallery .prev');
const eventNextButton = document.querySelector('#event-gallery .next');
const eventCarousel = document.querySelector('#event-gallery .carousel');

if (eventGallerySlides.length && eventGalleryDots.length && eventCarousel) {
  let eventCurrentSlide = 0;
  let eventAutoRotateTimer = null;
  let eventDragStartX = 0;

  function getEventPosition(index) {
    const distance = (index - eventCurrentSlide + eventGallerySlides.length) % eventGallerySlides.length;
    return distance > eventGallerySlides.length / 2 ? distance - eventGallerySlides.length : distance;
  }

  function showEventSlide(index) {
    eventCurrentSlide = (index + eventGallerySlides.length) % eventGallerySlides.length;

    eventGallerySlides.forEach((slide, i) => {
      const position = getEventPosition(i);
      const isActive = position === 0;
      const isLeft = position === -1 || position === -2;
      const isRight = position === 1 || position === 2;

      slide.classList.toggle('active', isActive);
      slide.classList.toggle('left-side', isLeft);
      slide.classList.toggle('right-side', isRight);
      slide.style.opacity = isActive ? '1' : isLeft || isRight ? '0.8' : '0';
      slide.style.visibility = isActive || isLeft || isRight ? 'visible' : 'hidden';
      slide.style.pointerEvents = 'auto';
      slide.style.zIndex = String(10 - Math.abs(position));
    });

    eventGalleryDots.forEach((dot, i) => {
      dot.classList.toggle('active', i === eventCurrentSlide);
    });
  }

  function startEventAutoRotate() {
    window.clearInterval(eventAutoRotateTimer);
    eventAutoRotateTimer = window.setInterval(() => {
      showEventSlide(eventCurrentSlide + 1);
    }, 5000);
  }

  function moveEventToNext(direction) {
    showEventSlide(eventCurrentSlide + direction);
    startEventAutoRotate();
  }

  if (eventPrevButton) {
    eventPrevButton.addEventListener('click', (event) => {
      event.preventDefault();
      moveEventToNext(-1);
    });
  }

  if (eventNextButton) {
    eventNextButton.addEventListener('click', (event) => {
      event.preventDefault();
      moveEventToNext(1);
    });
  }

  eventGalleryDots.forEach((dot) => {
    dot.addEventListener('click', (event) => {
      event.preventDefault();
      showEventSlide(Number(dot.dataset.index));
      startEventAutoRotate();
    });
  });

  if (eventCloseButton && eventSidePoster) {
    eventCloseButton.addEventListener('click', () => {
      eventSidePoster.classList.add('hidden');
    });
  }

  eventCarousel.addEventListener('wheel', (event) => {
    event.preventDefault();
    if (Math.abs(event.deltaY) < 12) return;
    moveEventToNext(event.deltaY > 0 ? 1 : -1);
  }, { passive: false });

  eventCarousel.addEventListener('pointerdown', (event) => {
    const slideLink = event.target.closest('.slide');
    if (slideLink) {
      return;
    }

    eventDragStartX = event.clientX;
    if (eventCarousel.setPointerCapture) {
      eventCarousel.setPointerCapture(event.pointerId);
    }
  }, { passive: false });

  eventCarousel.addEventListener('pointerup', (event) => {
    const delta = event.clientX - eventDragStartX;
    if (Math.abs(delta) > 40) {
      moveEventToNext(delta < 0 ? 1 : -1);
    }
  });

  const sidePosterLink = document.querySelector('#event-gallery .side-poster-link');
  if (sidePosterLink) {
    sidePosterLink.addEventListener('click', (event) => {
      event.preventDefault();
      const posterId = Number(sidePosterLink.getAttribute('href').match(/poster=(\d+)/)?.[1]);
      if (posterId) {
        window.location.href = `./event-detail.html?poster=${posterId}`;
      }
    });
  }

  eventGallerySlides.forEach((slide) => {
    slide.setAttribute('tabindex', '0');

    slide.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const posterId = Number(slide.dataset.poster);
        if (posterId) {
          window.location.assign(`./event-detail.html?poster=${posterId}`);
        }
      }
    });
  });

  startEventAutoRotate();
  showEventSlide(0);
}

initContactLinks();
initNavPhoneMenu();
initForm();
initBookingModal();
initClickwrapOnFirstVisit();


function fitTextToWidth(el, maxFont = 18, minFont = 8) {
  const parent = el.parentElement;
  let fontSize = maxFont;

  el.style.fontSize = fontSize + "px";

  while (el.scrollWidth > parent.clientWidth && fontSize > minFont) {
    fontSize -= 1;
    el.style.fontSize = fontSize + "px";
  }
}

function fitMyNameToWidth(el, maxFont = 30, minFont = 8) {
  const parent = el.parentElement;
  let fontSize = maxFont;

  el.style.fontSize = fontSize + "px";

  while (el.scrollWidth > parent.clientWidth && fontSize > minFont) {
    fontSize -= 1;
    el.style.fontSize = fontSize + "px";
  }
}

window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('.fit-text').forEach(el => fitTextToWidth(el));
  window.addEventListener("resize", () => {
    document.querySelectorAll('.fit-text').forEach(el => fitTextToWidth(el));
  });
});

window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('.fit-my-name').forEach(el => fitMyNameToWidth(el));
  window.addEventListener("resize", () => {
    document.querySelectorAll('.fit-my-name').forEach(el => fitMyNameToWidth(el));
  });
});



document.addEventListener("DOMContentLoaded", function () {
  const fadeDiv = document.querySelector('.page-fade');
  if (fadeDiv) {
    fadeDiv.classList.remove('active'); // Ensure it's hidden on load
  }

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function (e) {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('#') && !link.classList.contains('active')) {
        e.preventDefault();
        if (fadeDiv) {
          fadeDiv.classList.add('active');
          setTimeout(() => {
            window.location.href = href;
          }, 400); // match transition duration
        } else {
          window.location.href = href;
        }
      }
    });
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const navLinks = document.querySelectorAll('.nav-link');
  const currentPath = window.location.pathname.split('/').pop();

  if (currentPath === 'blogs.html') {
    // Only highlight "scientific blogs" on blogs.html
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href').includes('blogs.html')) {
        link.classList.add('active');
      }
    });
  } else {
    // Highlight section links on index.html as you scroll
    const sectionLinks = Array.from(navLinks).filter(link => link.getAttribute('href').includes('index.html#'));
    const sectionIds = sectionLinks.map(link => link.getAttribute('href').split('#')[1]);
    const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

    function activateNav() {
      let index = sections.length - 1;
      for (let i = 0; i < sections.length; i++) {
        if (window.scrollY + 180 < sections[i].offsetTop) { // initially offset was 70, changed to 180
          index = i - 1;
          break;
        }
      }
      sectionLinks.forEach(link => link.classList.remove('active'));
      if (index >= 0) {
        sectionLinks[index].classList.add('active');
      }
      // Remove highlight from blogs link
      navLinks.forEach(link => {
        if (link.getAttribute('href').includes('blogs.html')) {
          link.classList.remove('active');
        }
      });
    }

    window.addEventListener('scroll', activateNav);
    activateNav(); // Initial highlight
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const pubImages = document.querySelectorAll('.pub-fade-img');
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );
  pubImages.forEach(img => observer.observe(img));
});

document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll('.author-list').forEach(function(list) {
    const andMore = list.querySelector('.and-more');
    const hidden = list.querySelector('.hidden-authors');
    if (!andMore || !hidden) return;

    andMore.addEventListener('click', function () {
      andMore.style.display = 'none';
      hidden.style.display = 'inline';
      // Animate reveal
      const text = hidden.textContent;
      hidden.textContent = '';
      let i = 0;
      function reveal() {
        if (i <= text.length) {
          hidden.textContent = text.slice(0, i);
          i++;
          setTimeout(reveal, 35); // adjust speed here
        }
      }
      reveal();
    });
    // Optional: allow keyboard access
    andMore.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        andMore.click();
      }
    });
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const btn = document.getElementById('toggle-diabsense');
  const details = document.getElementById('about-this-work');
  let expanded = false;

  btn.addEventListener('click', function () {
    expanded = !expanded;
    if (expanded) {
      details.style.maxHeight = details.scrollHeight + "px";
      btn.textContent = "hide details";
      btn.setAttribute('aria-expanded', 'true');
    } else {
      details.style.maxHeight = "0";
      btn.textContent = "show details";
      btn.setAttribute('aria-expanded', 'false');
    }
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const btnSwav = document.getElementById('toggle-swav');
  const detailsSwav = document.getElementById('about-swav-work');
  let expandedSwav = false;

  btnSwav.addEventListener('click', function () {
    expandedSwav = !expandedSwav;
    if (expandedSwav) {
      detailsSwav.style.maxHeight = detailsSwav.scrollHeight + "px";
      btnSwav.textContent = "hide details";
      btnSwav.setAttribute('aria-expanded', 'true');
    } else {
      detailsSwav.style.maxHeight = "0";
      btnSwav.textContent = "show details";
      btnSwav.setAttribute('aria-expanded', 'false');
    }
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const btnCnn3d = document.getElementById('toggle-cnn3d');
  const detailsCnn3d = document.getElementById('about-cnn3d-work');
  let expandedCnn3d = false;

  btnCnn3d.addEventListener('click', function () {
    expandedCnn3d = !expandedCnn3d;
    if (expandedCnn3d) {
      detailsCnn3d.style.maxHeight = detailsCnn3d.scrollHeight + "px";
      btnCnn3d.textContent = "hide details";
      btnCnn3d.setAttribute('aria-expanded', 'true');
    } else {
      detailsCnn3d.style.maxHeight = "0";
      btnCnn3d.textContent = "show details";
      btnCnn3d.setAttribute('aria-expanded', 'false');
    }
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const pubSection = document.getElementById('publications');
  const pubBtns = [
    document.getElementById('toggle-diabsense'),
    document.getElementById('toggle-swav'),
    document.getElementById('toggle-cnn3d')
  ];

  if (pubSection && pubBtns.every(Boolean)) {
    const animateBtns = () => {
      pubBtns.forEach((btn, i) => {
        btn.classList.remove('pub-btn-appear');
        // Force reflow to restart animation
        void btn.offsetWidth;
        btn.style.opacity = '0';
        btn.style.transform = 'translateX(-40px)';
        setTimeout(() => {
          btn.classList.add('pub-btn-appear');
        }, 100 + i * 120);
      });
    };

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            animateBtns();
            obs.disconnect(); // Only trigger once
          }
        });
      },
      { threshold: 0.3 }
    );
    observer.observe(pubSection);
  }
});

document.addEventListener("DOMContentLoaded", function () {
  // Publication thumbnail popup
  document.querySelectorAll('.pub-thumb-box').forEach(box => {
    box.addEventListener('click', function () {
      const img = box.querySelector('img');
      const modalImg = document.getElementById('pubModalImg');
      const modalCaption = document.getElementById('pubModalCaption');
      modalImg.src = img.src;
      modalImg.alt = img.alt;
      modalCaption.textContent = img.getAttribute('data-caption') || img.alt || '';
      // Show Bootstrap modal
      const modal = new bootstrap.Modal(document.getElementById('pubImgModal'));
      modal.show();
    });
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const navbarName = document.getElementById('navbar-name');
  const mainName = document.getElementById('main-name');

  function checkNameVisibility() {
    const rect = mainName.getBoundingClientRect();
    if (rect.bottom < 60) { // 60px for navbar height
      navbarName.style.opacity = 1;
    } else {
      navbarName.style.opacity = 0;
    }
  }

  window.addEventListener('scroll', checkNameVisibility);
  checkNameVisibility();
});


document.addEventListener("DOMContentLoaded", function () {
  const navLinks = document.querySelectorAll('.nav-link');
  const currentPage = window.location.pathname.split('/').pop();

  navLinks.forEach(link => {
    // Remove any existing active class
    link.classList.remove('active');
    link.removeAttribute('aria-current');

    // Get the href's filename (ignore hash)
    const href = link.getAttribute('href').split('#')[0];
    if (href === currentPage) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });
});

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

function slideTo(url) {
  // Only allow slide for specific URLs
  const allowedUrls = ['/index.html', '/blogs.html'];
  if (!allowedUrls.includes(url)) {
    window.location.href = url;
    return;
  }

  let transitionDiv = document.querySelector('.page-transition');
  if (!transitionDiv) {
    transitionDiv = document.createElement('div');
    transitionDiv.className = 'page-transition';
    document.body.appendChild(transitionDiv);
  }
  // Slide in
  setTimeout(() => {
    transitionDiv.classList.add('active');
  }, 10);

  // After slide in, slide out and navigate
  setTimeout(() => {
    transitionDiv.classList.add('exit');
    setTimeout(() => {
      window.location.href = url;
    }, 600); // match transition duration
  }, 600);
}

// Animate entry on page load
window.addEventListener('DOMContentLoaded', () => {
  let transitionDiv = document.querySelector('.page-transition');
  if (!transitionDiv) {
    transitionDiv = document.createElement('div');
    transitionDiv.className = 'page-transition active';
    document.body.appendChild(transitionDiv);
  }
  setTimeout(() => {
    transitionDiv.classList.remove('active');
    setTimeout(() => {
      transitionDiv.remove();
    }, 600);
  }, 10);
});

// Intercept navigation
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', function(e) {
    const href = link.getAttribute('href');
    // Only slide for navigation to another page
    if (href && !href.startsWith('#')) {
      e.preventDefault();
      slideTo(href);
    }
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
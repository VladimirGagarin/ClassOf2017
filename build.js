const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const DEFAULT_URL = "https://classof2017.example.com";
const configPath = path.join(ROOT, "site.config.json");
const studentsPath = path.join(ROOT, "students.json");

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const SITE_URL = (process.env.SITE_URL || config.siteUrl || DEFAULT_URL).replace(/\/+$/, "");
const SITE_NAME = config.siteName || "Alumni MMXVII";
const SCHOOL_NAME = config.schoolName || "St. Christopher High";

const students = JSON.parse(fs.readFileSync(studentsPath, "utf8"));

const esc = (value = "") =>
    String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[char]));

const encodePath = (value = "") => encodeURI(value.replace(/^\/+/, ""));

const absoluteUrl = (assetPath = "") => `${SITE_URL}/${encodePath(assetPath)}`;

const relativeAsset = (assetPath = "") => `../../${encodePath(assetPath)}`;

const baseSlug = (name = "") =>
    name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

const cleanText = (value = "") => String(value).replace(/\s+/g, " ").trim();

const accentInkFor = (color = "") => {
    const value = String(color).trim().toLowerCase();
    const namedLight = new Set(["yellow", "gold", "goldenrod", "orange", "amber", "khaki", "lightyellow"]);
    if (namedLight.has(value)) {
        return "#111827";
    }
    const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!hex) {
        return "#ffffff";
    }
    let digits = hex[1];
    if (digits.length === 3) {
        digits = digits.split("").map((char) => char + char).join("");
    }
    const red = parseInt(digits.slice(0, 2), 16);
    const green = parseInt(digits.slice(2, 4), 16);
    const blue = parseInt(digits.slice(4, 6), 16);
    const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
    return luminance > 0.62 ? "#111827" : "#ffffff";
};

const metaDescription = (value = "", max = 155) => {
    const text = cleanText(value);
    if (text.length <= max) {
        return text;
    }
    const cut = text.slice(0, max);
    return `${cut.slice(0, cut.lastIndexOf(" "))}...`;
};

const rolesFor = (student) =>
    (student.studentRoles || []).filter((role) => {
        const value = cleanText(role).toLowerCase();
        return value && value !== "none";
    });

const withSlugs = (list) => {
    const used = new Set();
    return list.map((student) => {
        const fallback = baseSlug(student.studentName) || "student";
        let slug = fallback;
        if (used.has(slug)) {
            slug = `${fallback}-${student.studentAdmissionNumber}`;
        }
        let candidate = slug;
        let counter = 2;
        while (used.has(candidate)) {
            candidate = `${slug}-${counter}`;
            counter += 1;
        }
        used.add(candidate);
        return { student, slug: candidate };
    });
};

const entries = withSlugs(students);
const today = new Date().toISOString().slice(0, 10);

const renderRoles = (roles, className) => {
    if (!roles.length) {
        return "";
    }
    const items = roles.map((role) => `<li>${esc(role)}</li>`).join("");
    return `<ul class="${className}">${items}</ul>`;
};

const renderAudio = (label, src, description, options = {}) => {
    if (!src) {
        return "";
    }
    const { tribute = false, favourite = false } = options;
    const cardClass = tribute ? " audio-card-tribute" : favourite ? " audio-card-favourite" : "";
    return `
                <div class="audio-card${cardClass}">
                    <div class="audio-card-head">
                        <span class="audio-icon"><i class="fas fa-headphones"></i></span>
                        <div>
                            <h3>${esc(label)}</h3>
                            <p>${esc(description)}</p>
                        </div>
                    </div>
                    ${tribute
                        ? `<button class="audio-cta" type="button" data-tribute-open aria-haspopup="dialog"><i class="fas fa-play"></i> Play tribute</button>`
                        : favourite
                            ? `<button class="audio-cta" type="button" data-favourite-open aria-haspopup="dialog"><i class="fas fa-music"></i> Play favourite song</button>`
                            : `<audio controls preload="none" src="${relativeAsset(src)}"></audio>`}
                </div>`;
};

const renderGallery = (student, name) => {
    const photos = student.studentPhotos || [];
    if (!photos.length) {
        return "";
    }
    const images = photos
        .map((photo, index) => `
                    <figure class="gallery-item">
                        <img src="${relativeAsset(photo)}" alt="${esc(name)} Class of 2017 photo ${index + 1}" loading="lazy" decoding="async">
                    </figure>`)
        .join("");
    return `<div class="profile-gallery">${images}</div>`;
};

const renderProfile = ({ student, slug }, index) => {
    const name = student.studentName;
    const alias = cleanText(student.studentAlias);
    const firstName = name.split(" ")[0];
    const admission = student.studentAdmissionNumber;
    const description = cleanText(student.studentDescription);
    const quote = cleanText(student.studentQuote);
    const roles = rolesFor(student);
    const photos = student.studentPhotos || [];
    const heroPhoto = photos[0] || "logo.png";
    const accent = student.studentFavColor || "#0056b3";
    const accentInk = accentInkFor(accent);
    const profileUrl = `${SITE_URL}/students/${slug}/`;
    const title = `${name}${alias ? ` (${alias})` : ""} - Class of 2017 | ${SITE_NAME}`;
    const descriptionMeta = metaDescription(description);
    const prev = entries[(index - 1 + entries.length) % entries.length];
    const next = entries[(index + 1) % entries.length];

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Person",
        name,
        alternateName: alias || undefined,
        description,
        image: absoluteUrl(heroPhoto),
        url: profileUrl,
        alumniOf: {
            "@type": "EducationalOrganization",
            name: SCHOOL_NAME
        },
        award: roles.length ? roles.join(", ") : undefined
    };

    const breadcrumbs = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: "Class of 2017", item: `${SITE_URL}/` },
            { "@type": "ListItem", position: 2, name: "Students", item: `${SITE_URL}/students/` },
            { "@type": "ListItem", position: 3, name, item: profileUrl }
        ]
    };

    const jsonLdSafe = JSON.stringify([jsonLd, breadcrumbs], null, 2).replace(/</g, "\\u003c");

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(descriptionMeta)}">
    <meta name="robots" content="index,follow">
    <link rel="canonical" href="${esc(profileUrl)}">
    <meta property="og:type" content="profile">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(descriptionMeta)}">
    <meta property="og:url" content="${esc(profileUrl)}">
    <meta property="og:image" content="${esc(absoluteUrl(heroPhoto))}">
    <meta property="og:site_name" content="${esc(SITE_NAME)}">
    <meta property="profile:first_name" content="${esc(firstName)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)}">
    <meta name="twitter:description" content="${esc(descriptionMeta)}">
    <meta name="twitter:image" content="${esc(absoluteUrl(heroPhoto))}">
    <link rel="shortcut icon" href="../../logo.png" type="image/x-icon">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="../../style.css">
    <script type="application/ld+json">${jsonLdSafe}</script>
</head>
<body class="profile-page wiki-page">
    <header class="site-header">
        <a class="site-brand" href="../../">
            <img src="../../logo.png" alt="${esc(SITE_NAME)} logo">
            <span>${esc(SITE_NAME)}</span>
        </a>
        <a class="back-link" href="../../"><i class="fas fa-arrow-left"></i> All students</a>
    </header>

    <main class="profile-main wiki-main">
        <nav class="breadcrumb" aria-label="Breadcrumb">
            <a href="../../">Class of 2017</a>
            <span aria-hidden="true">/</span>
            <a href="../">Students</a>
            <span aria-hidden="true">/</span>
            <span aria-current="page">${esc(name)}</span>
        </nav>

        <p class="wiki-hatnote">This article is about a member of the Class of 2017. For the complete class, see <a href="../">All students</a>. Missing someone? <a href="../../add-student/">Add a student</a>.</p>

        <div class="wiki-layout" style="--accent: ${esc(accent)}; --accent-ink: ${esc(accentInk)}">
            <div class="wiki-header" style="--accent: ${esc(accent)}">
                <p class="wiki-kicker">Class of 2017 biography</p>
                <h1>${esc(name)}</h1>
                <p class="wiki-subtitle">${alias ? `${esc(alias)} &middot; ` : ""}Admission No. ${esc(admission)}</p>
                <p class="wiki-lead">${esc(description)}</p>

                <nav class="wiki-toc" aria-label="Contents">
                    <h2>Contents</h2>
                    <ol>
                        <li><a href="#media">Media</a></li>
                        ${photos.length ? `<li><a href="#gallery">Gallery</a></li>` : ""}
                        <li><a href="#see-also">See also</a></li>
                    </ol>
                </nav>
            </div>

            <article class="wiki-article">
                <section class="wiki-section" id="media">
                    <h2>Media</h2>
                    <p class="wiki-section-note">Tributes and music associated with ${esc(firstName)}.</p>
                    <div class="audio-grid">
                        ${renderAudio("Tribute audio", student.studentAudioReader, `A spoken tribute to ${name}`, { tribute: true })}
                        ${renderAudio("Favourite song", student.studentFavSong, `The song ${name} is remembered by`, { favourite: true })}
                    </div>
                </section>

                ${photos.length ? `<section class="wiki-section" id="gallery">
                    <h2>Gallery</h2>
                    ${renderGallery(student, name)}
                </section>` : ""}

                <section class="wiki-section" id="see-also">
                    <h2>See also</h2>
                    <ul class="wiki-see-also">
                        <li><a href="../">All students of the Class of 2017</a></li>
                        <li><a href="../../">Class of 2017 home</a></li>
                        <li><a href="../../trailer/">Class of 2017 trailer</a></li>
                        <li><a href="../../add-student/">Add a student (submit details to admin)</a></li>
                    </ul>
                </section>

                <nav class="wiki-nav" aria-label="More students">
                    <a class="wiki-nav-link" href="../${prev.slug}/">
                        <span class="wiki-nav-label"><i class="fas fa-arrow-left"></i> Previous</span>
                        <span class="wiki-nav-name">${esc(prev.student.studentName)}</span>
                    </a>
                    <a class="wiki-nav-link wiki-nav-next" href="../${next.slug}/">
                        <span class="wiki-nav-label">Next <i class="fas fa-arrow-right"></i></span>
                        <span class="wiki-nav-name">${esc(next.student.studentName)}</span>
                    </a>
                </nav>
            </article>

            <aside class="wiki-infobox" aria-label="Quick facts about ${esc(name)}">
                <figure class="wiki-infobox-figure">
                    <img src="${relativeAsset(heroPhoto)}" alt="${esc(`${name}${alias ? `, ${alias}` : ""}, Class of 2017`)}" fetchpriority="high">
                    <figcaption>${esc(name)}, Class of 2017</figcaption>
                </figure>
                <h2>${esc(name)}</h2>
                <table class="wiki-infobox-table">
                    <tbody>
                        ${alias ? `<tr><th scope="row">Alias</th><td>${esc(alias)}</td></tr>` : ""}
                        <tr><th scope="row">Admission No.</th><td>${esc(admission)}</td></tr>
                        <tr><th scope="row">Class</th><td>Class of 2017</td></tr>
                        <tr><th scope="row">School</th><td>${esc(SCHOOL_NAME)}</td></tr>
                        ${roles.length ? `<tr><th scope="row">Roles</th><td>${roles.map((role) => esc(role)).join(", ")}</td></tr>` : ""}
                    </tbody>
                </table>
                ${quote ? `<blockquote class="wiki-quote">&ldquo;${esc(quote)}&rdquo;</blockquote>` : ""}
            </aside>
        </div>
    </main>

    ${student.studentAudioReader ? `<div class="tribute-overlay" id="tribute-overlay" aria-hidden="true" style="--accent: ${esc(accent)}; --accent-ink: ${esc(accentInk)}">
        <div class="tribute-dialog" role="dialog" aria-modal="true" aria-labelledby="tribute-title">
            <button class="tribute-close" type="button" data-tribute-close aria-label="Close tribute"><i class="fas fa-xmark"></i></button>
            <div class="tribute-visual">
                <img src="${relativeAsset(heroPhoto)}" alt="${esc(name)}" loading="lazy" decoding="async">
                <div class="tribute-visual-copy">
                    <p class="tribute-kicker">Class of 2017 tribute</p>
                    <h2 id="tribute-title">${esc(name)}</h2>
                    <p>${alias ? `${esc(alias)} &middot; ` : ""}Admission No. ${esc(admission)}</p>
                </div>
            </div>
            <div class="tribute-body">
                <div class="tribute-description-card">
                    ${quote ? `<blockquote class="tribute-quote">&ldquo;${esc(quote)}&rdquo;</blockquote>` : ""}
                    <p class="tribute-description">${esc(description)}</p>
                </div>
                <div class="tribute-actions">
                    <button class="tribute-play" type="button" data-tribute-play>
                        <i class="fas fa-play"></i><span>Play tribute</span>
                    </button>
                    ${photos.length ? `<a class="tribute-cta" href="#gallery" data-tribute-gallery><i class="fas fa-images"></i> View photos</a>` : ""}
                    <a class="tribute-cta tribute-cta-ghost" href="../${next.slug}/">Next: ${esc(next.student.studentName)} <i class="fas fa-arrow-right"></i></a>
                </div>
                <div class="tribute-progress" aria-hidden="true"><span data-tribute-progress></span></div>
                <div class="tribute-times"><span data-tribute-current>0:00</span><span data-tribute-duration>0:00</span></div>
                <audio data-tribute-audio preload="metadata" src="${relativeAsset(student.studentAudioReader)}"></audio>
            </div>
        </div>
    </div>` : ""}

    ${student.studentFavSong ? `<div class="media-overlay profile-media-overlay" id="favourite-overlay" role="dialog" aria-modal="true" aria-label="Favourite song player for ${esc(name)}" aria-hidden="true" style="--accent: ${esc(accent)}; --accent-ink: ${esc(accentInk)}">
        <button type="button" class="media-close" data-favourite-close aria-label="Close favourite song player"><span>&times;</span></button>
        <div class="media-content">
            <div class="beatsync">
                <div class="beatsync-photo" data-favourite-photo></div>
                <div class="beatsync-glow" aria-hidden="true"></div>
                <span class="beatsync-badge"><i class="fas fa-music"></i> Now playing</span>
                <div class="beatsync-eq" aria-hidden="true">${"<span></span>".repeat(20)}</div>
            </div>
            <div class="quote-content">
                <p class="media-kicker">Favourite song</p>
                <h3 class="media-name">${esc(name)}</h3>
                <p class="media-quote">${esc(quote || "A favourite song from the Class of 2017.")}</p>
                <div class="media-actions">
                    <button class="media-toggle" type="button" data-favourite-toggle><i class="fas fa-play"></i><span>Play song</span></button>
                    ${photos.length ? `<a class="media-link" href="#gallery" data-favourite-gallery><i class="fas fa-images"></i> Photos</a>` : ""}
                    <a class="media-link media-link-ghost" href="../${next.slug}/">Next: ${esc(next.student.studentName)}</a>
                </div>
                <div class="media-progress" aria-hidden="true"><span data-favourite-progress></span></div>
                <div class="media-times"><span data-favourite-current>0:00</span><span data-favourite-duration>0:00</span></div>
                <div hidden>${photos.map((photo) => `<span data-favourite-photo-url="${relativeAsset(photo)}"></span>`).join("")}</div>
                <audio data-favourite-audio preload="metadata" src="${relativeAsset(student.studentFavSong)}"></audio>
            </div>
        </div>
    </div>` : ""}

    <footer class="site-footer">
        <p>${esc(SITE_NAME)} &mdash; Class of 2017. <a href="../">Browse all students</a> &middot; <a href="../../trailer/">Watch the trailer</a> &middot; <a href="../../add-student/">Add a new student</a></p>
    </footer>
    <script src="../../profile.js" defer></script>
</body>
</html>
`;
};

const renderDirectory = () => {
    const cards = entries
        .map(({ student, slug }) => {
            const photo = (student.studentPhotos || [])[0] || "logo.png";
            const roles = rolesFor(student);
            return `
            <li class="directory-card">
                <a href="./${slug}/">
                    <div class="directory-photo">
                        <img src="../${encodePath(photo)}" alt="${esc(student.studentName)} Class of 2017" loading="lazy" decoding="async">
                    </div>
                    <div class="directory-info">
                        <h2>${esc(student.studentName)}</h2>
                        ${student.studentAlias ? `<p class="directory-alias">${esc(student.studentAlias)}</p>` : ""}
                        ${renderRoles(roles, "directory-roles")}
                    </div>
                </a>
            </li>`;
        })
        .join("");

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <title>All Students - Class of 2017 | ${esc(SITE_NAME)}</title>
    <meta name="description" content="Browse every student profile from the Class of 2017. Photos, tributes, favourite songs and memories.">
    <meta name="robots" content="index,follow">
    <link rel="canonical" href="${esc(`${SITE_URL}/students/`)}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="All Students - Class of 2017 | ${esc(SITE_NAME)}">
    <meta property="og:url" content="${esc(`${SITE_URL}/students/`)}">
    <meta property="og:image" content="${esc(absoluteUrl("logo.png"))}">
    <link rel="shortcut icon" href="../logo.png" type="image/x-icon">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="../style.css">
</head>
<body class="directory-page">
    <header class="site-header">
        <a class="site-brand" href="../">
            <img src="../logo.png" alt="${esc(SITE_NAME)} logo">
            <span>${esc(SITE_NAME)}</span>
        </a>
        <a class="back-link" href="../"><i class="fas fa-arrow-left"></i> Home</a>
    </header>

    <main class="directory-main">
        <div class="directory-heading">
            <p class="eyebrow">Class of 2017</p>
            <h1>All students</h1>
            <p>Browse every profile in the ${esc(SITE_NAME)} archive.</p>
        </div>
        <ul class="directory-grid">${cards}
        </ul>
    </main>

    <footer class="site-footer">
        <p>${esc(SITE_NAME)} &mdash; Class of 2017. <a href="./">Home</a> &middot; <a href="./trailer/">Watch the trailer</a> &middot; <a href="./add-student/">Add a new student</a></p>
    </footer>
</body>
</html>
`;
};

const renderTrailer = () => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <title>Trailer - Class of 2017 | ${esc(SITE_NAME)}</title>
    <meta name="description" content="Watch the Class of 2017 trailer for ${esc(SCHOOL_NAME)}. A short film of photos, tributes, favourite songs and memories.">
    <meta name="robots" content="index,follow">
    <link rel="canonical" href="${esc(`${SITE_URL}/trailer/`)}">
    <meta property="og:type" content="video.other">
    <meta property="og:title" content="Trailer - Class of 2017 | ${esc(SITE_NAME)}">
    <meta property="og:description" content="Watch the Class of 2017 trailer for ${esc(SCHOOL_NAME)}.">
    <meta property="og:url" content="${esc(`${SITE_URL}/trailer/`)}">
    <meta property="og:image" content="${esc(absoluteUrl("logo.png"))}">
    <meta property="og:video" content="${esc(absoluteUrl("readers/vid.mp4"))}">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="shortcut icon" href="../logo.png" type="image/x-icon">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="../style.css">
</head>
<body class="profile-page trailer-page">
    <header class="site-header">
        <a class="site-brand" href="../">
            <img src="../logo.png" alt="${esc(SITE_NAME)} logo">
            <span>${esc(SITE_NAME)}</span>
        </a>
        <a class="back-link" href="../"><i class="fas fa-arrow-left"></i> Home</a>
    </header>

    <main class="profile-main">
        <nav class="breadcrumb" aria-label="Breadcrumb">
            <a href="../">Home</a>
            <span aria-hidden="true">/</span>
            <span>Trailer</span>
        </nav>

        <article class="profile-card">
            <div class="profile-body trailer-body">
                <p class="eyebrow">Class of 2017</p>
                <h1>Watch the trailer</h1>
                <p class="profile-description">A short film of photos, tributes, favourite songs and memories from the ${esc(SCHOOL_NAME)} Class of 2017.</p>

                <video class="trailer-video" controls preload="metadata" playsinline poster="../logo.png">
                    <source src="../readers/vid.mp4" type="video/mp4">
                    Your browser does not support the video tag.
                </video>

                <div class="trailer-actions">
                    <a class="btn btn-primary" href="../"><i class="fas fa-play"></i> Back to the experience</a>
                    <a class="btn btn-ghost" href="../students/"><i class="fas fa-users"></i> Browse all students</a>
                </div>
            </div>
        </article>
    </main>

    <footer class="site-footer">
        <p>${esc(SITE_NAME)} &mdash; Class of 2017. <a href="../">Browse all students</a> &middot; <a href="../../trailer/">Watch the trailer</a> &middot; <a href="../../add-student/">Add a new student</a></p>
    </footer>
</body>
</html>
`;

const renderSitemap = () => {
    const urls = [
        `${SITE_URL}/`,
        `${SITE_URL}/students/`,
        `${SITE_URL}/trailer/`,
        ...entries.map(({ slug }) => `${SITE_URL}/students/${slug}/`)
    ];
    const items = urls
        .map((url) => `    <url>\n        <loc>${esc(url)}</loc>\n        <lastmod>${today}</lastmod>\n    </url>`)
        .join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</urlset>
`;
};

const write = (relativePath, content) => {
    const fullPath = path.join(ROOT, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf8");
    return fullPath;
};

entries.forEach((entry, index) => {
    write(path.join("students", entry.slug, "index.html"), renderProfile(entry, index));
});

write(path.join("students", "index.html"), renderDirectory());
write(path.join("trailer", "index.html"), renderTrailer());
write("sitemap.xml", renderSitemap());
write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);

const indexPath = path.join(ROOT, "index.html");
if (fs.existsSync(indexPath)) {
    const indexHtml = fs.readFileSync(indexPath, "utf8");
    const updatedIndex = indexHtml.replaceAll(DEFAULT_URL, SITE_URL);
    if (updatedIndex !== indexHtml) {
        fs.writeFileSync(indexPath, updatedIndex, "utf8");
    }
}

const addStudentDir = path.join(ROOT, "add-student");
if (fs.existsSync(addStudentDir) && fs.existsSync(path.join(addStudentDir, "index.html"))) {
    console.log("Add-student page present.");
}

console.log(`Built ${entries.length} student profiles, directory, trailer, sitemap and robots.txt for ${SITE_URL}`);


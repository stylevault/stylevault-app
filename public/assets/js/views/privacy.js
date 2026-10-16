import { icon } from '../lib.js';

export default function privacy(main, { setTitle }) {
  setTitle('Privacy Policy');

  main.innerHTML = `
    <article class="pv-page">
      <header class="pv-hero">
        <div class="wrap pv-hero-wrap">
          <span class="pv-badge">${icon('shield')} Transparency &amp; Trust</span>
          <h1>Privacy Policy</h1>
          <div class="pv-hero-meta">
            <span>Style Vault by Ria’s Colony · Last updated: October 2026</span>
          </div>
        </div>
      </header>

      <div class="wrap pv-layout">
        <nav class="pv-nav" aria-label="Privacy sections">
          <span class="pv-nav-title">Policy Sections</span>
          <a href="#overview">1. Overview</a>
          <a href="#collection">2. What We Collect</a>
          <a href="#usage">3. How We Use Data</a>
          <a href="#commitments">4. What We Never Do</a>
          <a href="#storage">5. Security &amp; Storage</a>
          <a href="#rights">6. Your Rights &amp; Control</a>
          <a href="#third-parties">7. Third Parties</a>
          <a href="#contact">8. Contact Us</a>
        </nav>

        <div class="pv-content">
          <!-- Overview -->
          <section class="pv-card" id="overview">
            <h2><span class="pv-sec-num">1.</span> Overview &amp; Data Philosophy</h2>
            <p>At Style Vault (a product of Ria’s Colony Ltd), we believe you should be able to explore, research, and understand the African continent without sacrificing your privacy.</p>
            <p>Our core architectural principle is <strong>data minimization</strong>: we only collect the minimum information required to deliver a trusted intelligence experience and sync your personal preferences across devices. Style Vault requires a user account so you can personalize news, check macroeconomic numbers, and curate verified research across all 54 African countries.</p>
          </section>

          <!-- What We Collect -->
          <section class="pv-card" id="collection">
            <h2><span class="pv-sec-num">2.</span> Information We Collect</h2>
            <p>To access Style Vault intelligence, follow African countries, and save articles, you create a free account. We collect:</p>
            <ul>
              <li><strong>Profile Information:</strong> Your name and email address.</li>
              <li><strong>Authentication Credentials:</strong> Securely salted and hashed passwords (we never see or store plain-text passwords).</li>
              <li><strong>Personal Preferences:</strong> The countries, topics, and keyword monitors you follow, plus the articles you bookmark in your personal vault.</li>
              <li><strong>Technical Metadata:</strong> Standard, transient HTTP server logs (IP address, browser user-agent) retained strictly for security, rate-limiting, and error diagnosis.</li>
            </ul>
          </section>

          <!-- How We Use Data -->
          <section class="pv-card" id="usage">
            <h2><span class="pv-sec-num">3.</span> How We Use Your Data</h2>
            <p>We process your personal information exclusively for the following purposes:</p>
            <ul>
              <li><strong>Delivering Your Vault:</strong> Generating your personalized Following feed and synchronizing your saved bookmarks across your devices.</li>
              <li><strong>Account Management:</strong> Authenticating your sessions and enabling you to manage your profile settings.</li>
              <li><strong>Service Health &amp; Security:</strong> Defending our servers against abusive automated bots, denial-of-service attacks, and fraudulent activity.</li>
            </ul>
          </section>

          <!-- What We Never Do -->
          <section class="pv-card" id="commitments">
            <h2><span class="pv-sec-num">4.</span> What We Never Do (Our Data Integrity Guarantee)</h2>
            <p>Our business model is built on providing trusted intelligence, not selling surveillance advertising. We make the following commitments:</p>
            <ul>
              <li><strong>No Data Sales:</strong> We never sell, rent, license, or trade your personal information or reading history to data brokers, ad networks, or commercial aggregators.</li>
              <li><strong>No Third-Party Ad Trackers:</strong> We do not embed ad pixels, cross-site trackers, or third-party marketing beacons on Style Vault.</li>
              <li><strong>No AI Model Scraping on Your Data:</strong> Your bookmarks, reading habits, and account details are never fed into commercial AI models.</li>
            </ul>
          </section>

          <!-- Security & Storage -->
          <section class="pv-card" id="storage">
            <h2><span class="pv-sec-num">5.</span> Security &amp; Data Storage</h2>
            <p>We treat the security of your data seriously:</p>
            <ul>
              <li><strong>Encryption in Transit:</strong> All communications between your browser and our platform are encrypted via modern TLS 1.3 / HTTPS.</li>
              <li><strong>Edge Infrastructure:</strong> Style Vault is hosted on distributed Cloudflare edge architecture with isolated database stores.</li>
              <li><strong>Minimal Retention:</strong> Server access logs are rotated automatically and purged after operational diagnosis.</li>
            </ul>
          </section>

          <!-- Your Rights & Control -->
          <section class="pv-card" id="rights">
            <h2><span class="pv-sec-num">6.</span> Your Rights &amp; Control</h2>
            <p>You maintain complete control over your data on Style Vault:</p>
            <ul>
              <li><strong>Access &amp; Export:</strong> You can review your saved stories, followed countries, and account details at any time from your Account settings.</li>
              <li><strong>Instant Deletion:</strong> You have the right to erase your account and all associated personal data with one click directly from your Account settings. Once deleted, your account and bookmarks are permanently removed from our active database.</li>
              <li><strong>Unsubscribe:</strong> If you receive administrative emails from us, you can opt out or request deletion at any time.</li>
            </ul>
          </section>

          <!-- Third Parties -->
          <section class="pv-card" id="third-parties">
            <h2><span class="pv-sec-num">7.</span> Third-Party Links &amp; Public Sources</h2>
            <p>Style Vault cites macroeconomic data from the World Bank’s World Development Indicators under the Creative Commons Attribution 4.0 International license (CC BY 4.0).</p>
            <p>When you click on an external news story or research report, you will navigate directly to the originating publisher’s website. Those third-party websites operate under their own independent privacy policies and terms of service, which we encourage you to review.</p>
          </section>

          <!-- Contact Us -->
          <section class="pv-card" id="contact">
            <h2><span class="pv-sec-num">8.</span> Contact &amp; Questions</h2>
            <p>If you have any questions, suggestions, or requests regarding this Privacy Policy or how your information is handled, please reach out to our team:</p>
            <p><strong>Style Vault Support Team</strong><br>
            Email: <a href="mailto:support@stylevault.app" class="text-link">support@stylevault.app</a><br>
            Website: <a href="https://riascolony.org" class="text-link" target="_blank" rel="noopener">riascolony.org ↗</a></p>
          </section>
        </div>
      </div>
    </article>
  `;
}

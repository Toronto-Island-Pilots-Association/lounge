-- Seed the first public TIPA page from the existing lounge frontdoor content.
-- Source: https://lounge.tipa.ca/ captured on 2026-03-29.

DO $$
DECLARE
  v_org_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; -- TIPA_ORG_ID
  v_content TEXT := $html$
<h1>Why Join the TIPA Community?</h1>
<h2>Become an Advocate for GA at CYTZ</h2>
<p>Add your voice to a growing group working to preserve space, resources, and fair operating conditions for GA at CYTZ.</p>
<h2>Connect with Other GA Pilots in Toronto</h2>
<p>Be part of a platform for local pilots to connect, share experiences, and learn from their peers. Participate in local events where pilots can network and build relationships.</p>
<p><a href="/become-a-member">Become a Member</a></p>
<h2>How You Can Get Involved</h2>
<ul>
  <li>Sign up to receive updates from TIPA.</li>
  <li>Attend future events, town halls, or hangar talks.</li>
  <li>Share your experience flying at CYTZ.</li>
  <li>Stay informed on advocacy efforts and airport developments.</li>
  <li>Help spread the word to other pilots and aviation supporters.</li>
  <li>Join TIPA and become a member of the growing community.</li>
</ul>
<h2>Join the TIPA Community</h2>
<p>Whether you fly every weekend or simply believe in the value of accessible aviation, be part of the community that supports GA in the city.</p>
<p><a href="/become-a-member">Get Started</a></p>
<h2>Our Mission</h2>
<p>TIPA is dedicated to the preservation and promotion of general aviation at Billy Bishop Toronto City Airport (CYTZ).</p>
$html$;
BEGIN
  IF EXISTS (SELECT 1 FROM organizations WHERE id = v_org_id) THEN
    INSERT INTO pages (org_id, title, slug, content, image_url, published)
    VALUES (
      v_org_id,
      'About TIPA',
      'about',
      v_content,
      NULL,
      true
    )
    ON CONFLICT (org_id, slug) DO UPDATE
      SET title = EXCLUDED.title,
          content = EXCLUDED.content,
          image_url = NULL,
          published = true,
          updated_at = NOW();
  END IF;
END $$;

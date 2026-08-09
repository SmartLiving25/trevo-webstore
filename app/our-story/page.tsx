import { StorePageShell } from "../components/StorePageShell";

export const metadata = { title: "Our Story | Trevo" };

export default function OurStoryPage() {
  return (
    <StorePageShell eyebrow="The Trevo point of view" title="Style that feels like you." introduction="Trevo was created for women who want beautiful everyday pieces to feel special without feeling out of reach.">
      <div className="story-page-grid">
        <div><h2>Designed for real days</h2><p>We select versatile silhouettes, considered colours and polished details for work, weekends and every version of you.</p><p>Each collection balances beautiful form with everyday function, with thoughtful options for customers across Pakistan.</p></div>
        <img
          src="/images/trevo-hero-1200.webp"
          alt="Trevo handbags in a calm studio setting"
          width="1200"
          height="751"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="information-callout"><h2>Carry confidence, every day.</h2><a href="/bags">Explore all bags</a></div>
    </StorePageShell>
  );
}

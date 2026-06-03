"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Mobile sticky CTA bar. Appears once the hero's CTA row scrolls out of view and
 * hides while those CTAs are visible, so the primary actions are always reachable
 * without duplicating a permanent bar on top of the hero. Uses IntersectionObserver
 * on the hero CTA row (passed by id). Hidden entirely on wider viewports via CSS.
 */
export function StickyCtas({ watchId }: { watchId: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const target = document.getElementById(watchId);
    if (!target || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setShow(!entry.isIntersecting),
      { rootMargin: "0px", threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [watchId]);

  return (
    <div className="sticky-ctas" data-visible={show} aria-hidden={!show}>
      <Link className="btn btn-filled btn-block" href="/create" tabIndex={show ? 0 : -1}>
        Create a League
      </Link>
      <Link className="btn btn-outlined btn-block" href="/join" tabIndex={show ? 0 : -1}>
        Join a League
      </Link>
    </div>
  );
}

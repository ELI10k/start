const FORM_ID = "magic-link-confirmation";

export default function MagicLinkConfirmation({ tokenHash, next }: { tokenHash: string; next: string }) {
  return <>
    <form id={FORM_ID} action="/auth/accept-link" method="post" className="mt-7">
      <input type="hidden" name="token_hash" value={tokenHash}/>
      <input type="hidden" name="next" value={next}/>
      <button type="submit" className="premium-primary-button w-full">
        כניסה מאובטחת והמשך
      </button>
    </form>
    {/* A GET may be opened by a mail security scanner, so OTP verification
        remains behind a POST. A real browser schedules this before hydration
        and submits after the initial response has fully loaded. The submission
        therefore does not depend on React, but also does not interrupt Next's
        streamed response while its client router is still initializing. */}
    <script dangerouslySetInnerHTML={{
      __html: `(()=>{const submit=()=>document.getElementById(${JSON.stringify(FORM_ID)})?.submit();if(document.readyState==="complete")submit();else window.addEventListener("load",submit,{once:true});})();`,
    }}/>
  </>;
}

export default function Process() {
  return (
    <section className="process" id="process">
      <div className="wrap process-single">
        <div>
          <div className="eyebrow">How An Evaluation Runs</div>
          <h2 style={{ margin: "12px 0 24px", fontSize: "clamp(1.6rem,2.8vw,2.1rem)" }}>
            Six steps, from brief to follow-up.
          </h2>
          <ul className="process-steps">
            <li className="process-step">
              <span className="ps-num">1</span>
              <div>
                <h4>Booking & details</h4>
                <p>Fill in your property type, package, and building dimensions, then answer the direction questions for each room. A floor plan or sketch upload is optional but helps accuracy.</p>
              </div>
            </li>
            <li className="process-step">
              <span className="ps-num">2</span>
              <div>
                <h4>Confirmation</h4>
                <p>We review the measurements and directions you've submitted and follow up if anything needs clarifying before analysis begins.</p>
              </div>
            </li>
            <li className="process-step">
              <span className="ps-num">3</span>
              <div>
                <h4>Report preparation</h4>
                <p>The full Vastu evaluation report is prepared and shared with you as a PDF.</p>
              </div>
            </li>
            <li className="process-step">
              <span className="ps-num">4</span>
              <div>
                <h4>Explanation call</h4>
                <p>A Zoom / Google Meet walkthrough of the report, with time set aside for your questions.</p>
              </div>
            </li>
            <li className="process-step">
              <span className="ps-num">5</span>
              <div>
                <h4>Guidance for correction</h4>
                <p>Practical guidance — energy activation, colour therapy, interior furniture positions, and personalised direction advice.</p>
              </div>
            </li>
            <li className="process-step">
              <span className="ps-num">6</span>
              <div>
                <h4>Follow-up</h4>
                <p>Twelve months of validity for follow-up questions as you implement the recommendations.</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

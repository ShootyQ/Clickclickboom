(function(root){
  'use strict';
  const START=49900, STEP=5, GOAL=50000;
  const lines=[
    "ONE HUNDRED LEFT! Story later. HISTORY NOW!",
    "Hold my tiny hand. Actually, keep squishing it!",
    "Nobody sneeze. Especially me. I have no nose.",
    "I can practically SMELL the confetti!",
    "Eighty left! My feet have started rehearsing!",
    "The trophy guy just sat up in his chair.",
    "WE ARE GETTING ALARMINGLY CLOSE!",
    "I've forgotten every sensible thing I've ever known!",
    "Sixty left! COME ON, YOU ABSOLUTE LEGEND!",
    "My victory speech is just seventeen minutes of yelling!",
    "FIFTY! Half a hundred! A very small enormous number!",
    "I'm smiling so hard my cheeks need planning permission!",
    "Forty! The confetti is trying to escape the bag!",
    "Please tell my feet to stop dancing early!",
    "THIRTY! I HAVE RUN OUT OF INDOOR VOICE!",
    "We're so close I could lick the finish line!",
    "TWENTY! YOU AND ME! LOOK AT US!",
    "FIFTEEN! I CAN'T BELIEVE WE'RE EVEN HERE!",
    "TEN! TEN! SOMEBODY HOLD THE TROPHY STEADY!",
    "THE LAST FIVE! COME ON! COME ON! COME ON!"
  ];
  const cheers=[
    "NO WAY!! YOU DID IT! YOU ACTUALLY DID IT!",
    "FIFTY THOUSAND SQUISHES. AND I STILL HAVE FEET!",
    "I HAD A SPEECH. I ATE IT. I'M VERY EXCITED!",
    "YOU! YES, YOU! ABSOLUTE BLOBBING LEGEND!",
    "SOMEONE GET A BIGGER BAG OF CONFETTI!",
    "I PICKED OUT OUR TROPHY. I DIDN'T THINK WE'D NEED IT!",
    "LOOK AT US! STILL SQUISHY! COMPLETELY RIDICULOUS!",
    "THANK YOU FOR EVERY SINGLE SQUISH. ALL 50,000."
  ];
  function current(run){return Number.isInteger(run)&&run>=START&&run<GOAL?{remaining:GOAL-run,index:Math.floor((run-START)/STEP),text:lines[Math.floor((run-START)/STEP)]}:null}
  const api={START,STEP,lines,cheers,current};
  if(typeof module!=='undefined')module.exports=api;else root.BlobFinale=api;
})(globalThis);

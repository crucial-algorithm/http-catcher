module.exports = class SimpleScheduler {
  constructor() {
    this.jobs = [];
    this.status = 'idle';
    this.interval = -1;
  }

  start() {
    if (this.status === 'running') return;
    console.log('... starting scheduler');

    // start interval
    this.interval = setInterval(() => {
      console.log(`... running pipeline with ${this.jobs.length} job(s)`);

      Promise.all(this.jobs.map(async (job) => {
        if (Date.now() < job.when || job.executed === true) {
          console.log('... job will be executed later (or already being executed)');
          return;
        }
        console.log('... executing job');
        job.executed = true
        await job.call();

      })).then(() => {

        // cleaning executed jobs
        this.jobs = this.jobs.filter(({executed}) => executed !== true);

        // check if we can stop to save resources
        if (this.jobs.length === 0) {
          console.log('... no jobs left');
          this._stop();
        }
      });

    }, 1000);

    this.status = 'running';
  }

  /**
   *
   * @param {{when: number, call: function}} job
   */
  add({when, call}) {
    console.log('... adding job to scheduler');
    this.jobs.push({when, call});
    this.status === 'idle' && this.start();
  }

  _stop() {
    console.log('... stopping scheduler');
    clearInterval(this.interval);
    this.interval = -1;
    this.status = 'idle';
  }
}

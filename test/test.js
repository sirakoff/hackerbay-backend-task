let chai = require('chai');
let chaiHttp = require('chai-http');
let should = chai.should();

let app = require('../index.js');

chai.use(chaiHttp);

describe('GET /thumbnail', () => {

    let token = "";
    let url = "http://images.unsplash.com/profile-1451435888837-4755067c2a33";

    before((done) => {
        
        chai.request(app)
          .post('/login')
          .send({
              username: 'dan',
              password: 'secret'
          }).end((err, res) => {

                // console.log(res);

                token = res.body.token;
            
                done();

          });
        
    });

    it('it should return 401', (done) => {
      chai.request(app)
          .get('/thumbnail')
          .end((err, res) => {

                res.should.have.status(401);
                done();

          });
    });

    it('it should return 500', (done) => {
        chai.request(app)
            .get('/thumbnail?url=http://google.notfound')
            .set('Authorization', `Bearer ${token}`)
            .end((err, res) => {
  
                  res.should.have.status(500);
                  done();
  
            });
      });

    it('it should return an Image', (done) => {
        chai.request(app)
            .get(`/thumbnail?url=${url}`)
            .set('Authorization', `Bearer ${token}`)
            .end((err, res) => {

                    res.headers['content-type'].should.contain('image');
                    res.should.have.status(200);

                  done();
  
            });
    });

    it('it should return an error message', (done) => {
        chai.request(app)
            .get(`/thumbnail?url=`)
            .set('Authorization', `Bearer ${token}`)
            .end((err, res) => {

                    res.body.message.should.eq("`url` is a required parameter and must be valid");
                    res.should.have.status(400);

                  done();
  
            });
    });

});

describe('POST /login', () => {

    it('it should return 404', (done) => {

        chai.request(app).get('/not-found').end((err, res) => {

            res.should.have.status(404);

            return done();

        });

    });

    it('it should return 400', (done) => {
      chai.request(app)
          .post('/login')
          .send({
              username: 'dan',
              password: ''
          })
          .end((err, res) => {

                res.should.have.status(400);
                done();

          });
    });

    it('it should return 400', (done) => {
        chai.request(app)
            .post('/login')
            .send({
                username: '',
                password: 'secret'
            })
            .end((err, res) => {
  
                  res.should.have.status(400);
                  done();
  
            });
      });

    it('it should return a token', (done) => {
        chai.request(app)
            .post(`/login`)
            .send({
                username: 'dan',
                password: 'secret'
            })
            .end((err, res) => {

                    res.body.should.include.keys("token");
                    res.should.have.status(200);

                  done();
  
            });
    });

});

describe('POST /patch', () => {

    let token = "";
    let body = {
        "patch": [
          { "op": "replace", "path": "/baz", "value": "boo" }
        ],
        "doc": {
          "baz": "qux",
          "foo": "bar"
        }
    };


    before((done) => {
        
        chai.request(app)
          .post('/login')
          .send({
              username: 'dan',
              password: 'secret'
          }).end((err, res) => {

                // console.log(res);

                token = res.body.token;
            
                done();

          });
        
    });

    it('it should return 401', (done) => {
      chai.request(app)
          .post('/patch')
          .send(body)
          .end((err, res) => {

                res.should.have.status(401);
                done();

          });
    });

    it('it should return an error', (done) => {
        chai.request(app)
            .post(`/patch`)
            .set('Authorization', `Bearer ${token}`)
            .send({})
            .end((err, res) => {

                    res.should.have.status(400);

                  done();
  
            });
    });

    it('it should return an error', (done) => {
        chai.request(app)
            .post(`/patch`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                patch: {},
                doc:{}
            })
            .end((err, res) => {

                    res.should.have.status(400);

                  done();
  
            });
    });

    it('it should return a patched object', (done) => {
        chai.request(app)
            .post('/patch')
            .set('Authorization', `Bearer ${token}`)
            .send(body)
            .end((err, res) => {

                    res.body.doc.should.deep.eq({
                        "baz": "boo",
                        "foo": "bar"
                    });

                    res.should.have.status(200);

                  done();
  
            });
    });

});

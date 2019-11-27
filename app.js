//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const session = require("express-session");

const app = express();

mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);



app.use(session({
  secret:process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGODB);

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended:true}));
app.set("view engine","ejs");

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  entries: [
    {
      name: String,
      author: String,
      publication: String,
      edition: String,
      location: String,
      publisher: String,
      year: Number,
      subject: String,
      content: String,
      ownerId: String
    }
  ]
});

userSchema.plugin(passportLocalMongoose);


const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", function(req,res){
  const authenticated = req.isAuthenticated();
  res.render("home",{loggedUser: authenticated});
});

app.get("/submit", isLoggedIn, function(req,res){
  const authenticated = req.isAuthenticated();
  res.render("submit",{loggedUser: authenticated});
});

app.post("/submit",function(req,res){
  const entry = req.body;
  entry.ownerId = req.user.id;
  User.findById(req.user.id, function(err, foundUser){
    if(!err){
      foundUser.entries.push(entry);
      foundUser.save();
      res.redirect("/entries");
    }
  });

});

app.get("/login", notLoggedIn, function(req,res){
  const authenticated = req.isAuthenticated();
  res.render("login",{failed: false, loggedUser: authenticated});
});

app.get("/register", notLoggedIn, function(req,res){
  const authenticated = req.isAuthenticated();
  res.render("register",{loggedUser: authenticated});
});

app.post("/register", notLoggedIn, function(req,res){
  User.register({username: req.body.username}, req.body.password, function(err,user){
    if(err){
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req,res,function(){
        res.redirect("/submit");
      });
    }
  });


});

app.post("/login", notLoggedIn, function(req,res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });



  req.login(user, function(err){
    if(err){
      console.log(err);
    } else {
      passport.authenticate("local")(req,res,function(){
        const authenticated = req.isAuthenticated();
        if(authenticated){
          res.redirect("/entries");
        } else {
          res.render("login", {failed:true, loggedUser:authenticated} );
        }

      });
    }
  });
});

app.get("/logout", isLoggedIn, function(req,res){
  req.logout();
  res.redirect("/");
});

app.get("/entries", isLoggedIn, function(req,res){
    User.findById(req.user.id, function(err, foundUser){
      const citations = foundUser.entries;
      const authenticated = req.isAuthenticated();
      if(!err)
        res.render("entries", {citations: citations, loggedUser: authenticated});
      });
});

app.get("/delete/:id", isLoggedIn, function(req,res){
  const entryId = req.params.id;
  const authenticated = req.isAuthenticated();
  User.findById(req.user.id, function(err, foundUser){
    if(!err){
      foundUser.entries.pull({_id:entryId});
      foundUser.save();
      res.render("success", {message:"Citação removida", loggedUser:authenticated});
    }
  });
});

app.get("/edit/:id", isLoggedIn, function(req,res){
  const authenticated = req.isAuthenticated();
  User.findById(req.user.id, function(err, foundUser){
    if(!err){
      const entryId = req.params.id;
      let foundEntry = "";
      foundUser.entries.forEach(function(entry){
        if (entryId === entry.id){
          foundEntry = entry;
        }
      });
      res.render("edit", {editEntry: foundEntry, loggedUser:authenticated });
    }

  });

});

app.post("/edit/:id", isLoggedIn, function(req,res){
  const authenticated = req.isAuthenticated();
  const entryId = req.params.id;
  User.findById(req.user.id, function(err, foundUser){
    let foundArticle = "";
    foundUser.entries.forEach(function(entry){
      entry.name = req.body.name;
      entry.author = req.body.author;
      entry.publication = req.body.publication;
      entry.edition = req.body.edition;
      entry.location = req.body.location;
      entry.publisher = req.body.publisher;
      entry.year = req.body.year;
      entry.subject = req.body.subject;
      entry.content= req.body.content;
    });
    foundUser.save();
    res.render("success", {loggedUser:authenticated});
  });

});



function isLoggedIn(req,res,next){
  if(req.isAuthenticated()){
    return next();
  }
  res.redirect("/login");
}

function notLoggedIn(req,res,next){
  if(!req.isAuthenticated()){
    return next();
  }
  res.redirect("/entries");
}

app.get("*", function(req,res){
  const authenticated = req.isAuthenticated();
  res.render("error", {loggedUser:authenticated});
});

let port = process.env.PORT;
if (port == NULL || port ==""){
  port = 3000;
}

app.listen(port,function(){
  console.log("Server has started on port 3000");
});

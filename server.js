const express=require('express')
const mongoose=require('mongoose')
const cors=require('cors')
const exp = require('constants')
const jwt=require('jsonwebtoken')
const Register=require('./models/register')
const Issue=require('./models/issues')
const middleware = require('./middleware')
const app=express()
const port=4500


//mongodb connection
mongoose.connect('mongodb://localhost:27017/timepass2').then(console.log("Db connected")).catch((err)=>{
    console.log(err)
})


//middlewares
app.use(cors())
app.use(express.json())

//routes


//register route
app.post('/register',async(req,res)=>{
    const email=req.body.email;
    const password=req.body.password;
    const role=req.body.role;
    try {
        // Check if the email already exists in the database
        const existingUser = await Register.findOne({ email });

        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists.' });
        }
       console.log(email+"  " + password)
        // Create a new user instance
        const newUser = new Register({ email, password,role });

        // Save the user to the database
        await newUser.save();

        res.status(201).json({ message: 'User registered successfully.' });
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Internal Server Error' });
    }
})

//login route
app.post('/login',async(req,res)=>{
    const email=req.body.email;
    const password=req.body.password;
    try {
        const currentUser = await Register.findOne({ email });
         const role=currentUser.role
        if (!currentUser) {
            return res.status(400).send('User does not exist');
        }

        // Compare the entered password with the stored password (plaintext)
        if (password !== currentUser.password) {
            return res.status(400).send('Invalid credentials');
        }

        if (currentUser) {
            // Generate a JWT token
            const token = jwt.sign({  email: currentUser.email, role: currentUser.role }, 'key', { expiresIn: '1hr' });
        
            // Send the JWT token to the frontend
            res.json({ token,role});
          } else {
            res.status(401).json({ message: 'Invalid credentials' });
          }

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
})

    app.post('/raiseanissue', async (req, res) => {
        try {

            // Extracted email from the middleware


            let token = req.header('x-token');
            if (!token) {
                return res.status(400).send('Token Not found');
            }
    
            let decoded = jwt.verify(token, 'key');


            console.log(decoded)
            const userEmail = decoded.email;
    
            // Form data from the request body
            const { branch, block, category,labname,explainissue } = req.body;
    
            //no duplicates
            const existingIssue = await Issue.findOne({
                branch,
                block,
                category,
                labname,
                studentmail: userEmail,
                status: 'Not Solved', // Assuming 'Not Solved' is the default status for a new issue
                explainissue
            });
    
            if (existingIssue) {
                // Issue with the same details already exists
                return res.status(400).json({ message: 'Duplicate issue details. Issue already raised.' });
            }
    

            const technicians = await Register.find({ role: 'technician', workbench: branch }).sort({ workload: 1 });
            if (!technicians || technicians.length === 0) {
                console.log(`No technicians found for branch: ${branch}`);
                return;
            }
            const minWorkloadTechnician = technicians[0];
            const currentDate = new Date();
            const formattedDate = currentDate.toLocaleDateString('en-GB');

            // Create a new Issue instance with the status set to "Not Solved"
            const newIssue = new Issue({
                branch,
                block,
                category,
                labname,
                studentmail:userEmail,
                assignedto:minWorkloadTechnician.email,
                status: 'Not Solved', // Default status
                explainissue,
               // date:Date.now().toString()
               date:formattedDate
            });
            minWorkloadTechnician.workload+=1;
            // Save the issue to the database
            await minWorkloadTechnician.save();
            await newIssue.save();
    
            return res.status(201).json({ message: 'Issue raised successfully.' });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    });

    //getting issues for subadmins

    app.get('/getissues',async(req,res)=>{

        let token = req.header('x-token');
            if (!token) {
                return res.status(400).send('Token Not found');
            }
    
            let decoded = jwt.verify(token, 'key');


            console.log(decoded)
           
            const technicianemail = decoded.email;
            const technicianIssues =await Issue.find({ assignedto: technicianemail });
          
            res.json(technicianIssues);
    })
    app.get('/studentissues',async(req,res)=>{
        let token = req.header('x-token');
        if (!token) {
            return res.status(400).send('Token Not found');
        }

        let decoded = jwt.verify(token, 'key');

        console.log(decoded)
        const studentemail=decoded.email;
        const studentIssues=await Issue.find({studentmail:studentemail})
        res.json(studentIssues)
    })
    app.post('/updatestatus/:id', async (req, res) => {
        try {
          const { status } = req.body;
          const { id } = req.params;
      
          // Find the issue by ID
          const issue = await Issue.findById(id);
      
          if (!issue) {
            return res.status(404).json({ message: 'Issue not found' });
          }
      
          // Update the status
          issue.status = status;
      
          // Save the updated issue
          const updatedIssue = await issue.save();
      
          // Send the updated issue as a response
          res.json(updatedIssue);
        } catch (error) {
          console.error('Error updating status:', error);
          res.status(500).json({ message: 'Internal Server Error', error: error.message });
        }
      });


      //change password

      app.post('/changepassword', async (req, res) => {
        try {
          let token = req.header('x-token');
          let  {password,newPassword } = req.body;
      
          if (!token) {
            return res.status(400).send('Token not found');
          }
          let decoded = jwt.verify(token, 'key');
          const mail = decoded.email;
          const user = await Register.findOne({ email: mail });
          if (!user) {
            return res.status(404).json({ message: 'User not found' });
          }

        //   if (user.password !== password) {
        //     return res.status(401).json({ message: 'Invalid current password' });
        //   }
        //   // Update the password
          user.password = newPassword;
          // Save the updated user
          await user.save();
          res.status(200).json({ message: 'Password updated successfully' });
        } catch (error) {
          console.error('Error changing password:', error);
          res.status(500).json({ message: 'Internal Server Error', error: error.message });
        }
      });

      app.get('/getallissues', async (req, res) => {
        try {
          const issues = await Issue.find({});
          res.json({ issues });
        } catch (error) {
          console.error('Error fetching all issues:', error);
          res.status(500).json({ message: 'Internal Server Error', error: error.message });
        }
      });
      
      
      
      
//listening port
app.listen(port,()=>{
    console.log(`listening at ${port}`)
})
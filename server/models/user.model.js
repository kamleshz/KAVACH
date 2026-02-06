import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name : {
        type : String,
        required : [true,"Provide name"]
    },
    email : {
        type : String,
        required : [true, "provide email"],
        unique : true
    },
    password : {
        type : String,
        required : [true, "provide password"]
    },
    mobile : {
        type : Number,
        default : null
    },
    refresh_token : {
        type : String,
        default : ""
    },
    verify_email : {
        type : Boolean,
        default : false
    },
    last_login_date : {
        type : Date,
        default : null
    },
    failedLoginAttempts: {
        type: Number,
        default: 0
    },
    lastFailedLogin: {
        type: Date,
        default: null
    },
    status : {
        type : String,
        enum : ["Active","Inactive","Suspended"],
        default : "Active"
    },
    forgot_password_otp : {
        type : String,
        default : null
    },
    forgot_password_expiry : {
        type : Date,
        default : null
    },
    role : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'Role',
        required : false // Set to false initially to allow migration
    },
    last_login_photo: {
        type: String, // Base64 string of the last login photo
        default: null
    },
    last_login_ip: {
        type: String,
        default: ""
    },
    last_login_latitude: {
        type: Number,
        default: null
    },
    last_login_longitude: {
        type: Number,
        default: null
    }
},{
    timestamps : true
})

// Pre-validate hook to fix empty string dates before validation runs
userSchema.pre('validate', function() {
    if (this.last_login_date === "" || (typeof this.last_login_date === 'string' && this.last_login_date.trim() === "")) {
        this.last_login_date = null;
    }
    if (this.forgot_password_expiry === "" || (typeof this.forgot_password_expiry === 'string' && this.forgot_password_expiry.trim() === "")) {
        this.forgot_password_expiry = null;
    }
});

const UserModel = mongoose.model("User",userSchema)

export default UserModel

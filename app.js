const express = require('express')
const mysql = require('mysql2')
const { v4: uuidv4 } = require('uuid');
const cors = require('cors')

function generateToken() {
    return uuidv4();
}
let activeUsers = [];

const port = process.env.PORT || 8080

const db = mysql.createConnection({
    host: 'attenadnce-nano.cpka19y9rvyn.ap-south-1.rds.amazonaws.com',
    port: 3306,
    user: 'admin',
    password: 'fawad321',
    database: 'nanotech_attendance',
})

db.connect(err => {
    if (err) {
        throw err
    } else {
        console.log('MySql is connected')
    }
})

const app = express()

app.use(cors())

app.use(express.json());

function extendExipryTime(user) {
    var expireTimeInMS = 3600 * 1000;
    const exipiry = new Date(new Date().getTime() + expireTimeInMS)
    const index = activeUsers.indexOf(user);
    if (index > -1) {
        activeUsers[index].expire = exipiry
    }
}

function validateToken(req, res, next) {
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ error: 'Missing Authorization Header' });
    }

    // Check if the token exists in the users array
    const user = activeUsers.find((u) => u.token === token);

    if (user) {
        if (user.expire > new Date()) {
            extendExipryTime(user)
            req.token = token;
            next();
        } else {
            console.log(activeUsers)
            res.status(401).json({ error: 'session exipred' });
        }
    } else {
        res.status(401).json({ error: 'Invalid token or session exipred' });
    }
}

app.get('/api/getUserInfo', validateToken, (req, res) => {
    const token = req.header('Authorization');
    const activeUser = activeUsers.find((u) => u.token === token);
    let sql = `SELECT * FROM users WHERE id = ${activeUser.id}`
    db.query(sql, (err, results) => {
        console.log(sql)
        if (err) {
            res.status(401).json({ error: 'Error in Sql Querry or internal Error request Developer to restart the Node APP' });
        } else {
            const userData = results[0]
            if (userData) {
                res.json({ ok: true, userInfo: userData })
            } else {
                res.status(401).json({ error: 'User Not Found' });
            }
        }
    })

})

app.get('/api/getNodeUsers', validateToken, (req, res) => {
    const employees = users.filter((u) => u.role_id !== 1)
    console.log(employees)
    res.json({ ok: true, users: employees })
})

app.get('/api/getUsers', validateToken, (req, res) => {
    let sql = "SELECT * FROM users WHERE role_id != 1"
    db.query(sql, (err, results) => {
        if (err) {
            res.status(401).json({ error: 'Error in Sql Querry or internal Error request Developer to restart the Node APP' });
        }
        res.json({ ok: true, users: results })
    })
})

app.post('/api/addUser', validateToken, (req, res) => {
    const { name, email, role_id, password } = req.body;

    let sql = `INSERT INTO users (name, email, role_id, status, password) VALUES ('${name}', '${email}', ${role_id}, 1, '${password}')`

    db.query(sql, (err, results) => {
        if (err) {
            res.status(401).json({ error: 'Error in Sql Querry or internal Error request Developer to restart the Node APP' });
        }
        res.json({ ok: true })
    })

});

app.get('/api/deleteUsers', validateToken, (req, res) => {
    let sql = `DELETE FROM users WHERE id = ${req.query.id};`
    db.query(sql, (err, results) => {
        if (err) {
            res.status(401).json({ error: 'Error in Sql Querry or internal Error request Developer to restart the Node APP' });
        }
        res.json({ ok: true, users: results })
    })
})

app.post('/api/addProject', validateToken, (req, res) => {
    const { name, city, area } = req.body;

    let sql = `INSERT INTO projects (name, city, area) VALUES ('${name}', '${city}', '${area}')`

    db.query(sql, (err, results) => {
        if (err) {
            res.status(401).json({ error: 'Error in Sql Querry or internal Error request Developer to restart the Node APP' });
        }
        res.json({ ok: true })
    })

});

app.get('/api/daleteProject', validateToken, (req, res) => {

    let sql = `DELETE FROM projects WHERE id = ${req.query.id};`

    db.query(sql, (err, results) => {
        if (err) {
            res.status(401).json({ error: 'Error in Sql Querry or internal Error request Developer to restart the Node APP' });
        }
        res.json({ ok: true })
    })

});

app.get('/api/getProjects', validateToken, (req, res) => {
    let sql = "SELECT * FROM projects"
    db.query(sql, (err, results) => {
        if (err) {
            res.status(401).json({ error: 'Error in Sql Querry or internal Error request Developer to restart the Node APP' });
        }
        res.json({ ok: true, projects: results })
    })
})

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    let sql = `SELECT * FROM users WHERE email = '${username}' AND password = '${password}'`
    db.query(sql, (err, results) => {
        console.log(sql)
        if (err) {
            console.log(err)
            res.status(401).json({ error: 'Error in Sql Querry or internal Error request Developer to restart the Node APP' });
            return;
        } else {
            const user = results[0]
            if (user) {
                var expireTimeInMS = 3600 * 1000;
                const exipiry = new Date(new Date().getTime() + expireTimeInMS)
                const token = generateToken();
                activeUsers.push({
                    id: user.id,
                    email: user.email,
                    token: token,
                    expire: exipiry
                })
                console.log(activeUsers)
                res.json({ ok: true, token: token });
            } else {
                res.status(401).json({ error: 'Invalid credentials' });
                return;
            }
        }
    })
});

app.post('/api/cvc', validateToken, (req, res) => {
    let sql = `SELECT * FROM users WHERE password = '${req.body.oldPassword}' AND id = ${req.body.id}`
    db.query(sql, (err, results) => {
        console.log(sql)
        if (err) {
            console.log(err)
            res.status(401).json({ error: 'request Developer to restart the Node APP' });
            return;
        } else {
            let user = results[0]
            if (user) {
                sql = `UPDATE users set password = ${req.body.password} WHERE id = ${user.id}`
                db.query(sql, (err, results) => {
                    if (err) {
                        console.log(err)
                        res.status(401).json({ error: 'Report Develper about error code CVC' });
                        return;
                    }else{
                        res.json({ ok: true })
                    }
                })
            } else {
                res.status(404).json({ error: 'Your old password is not correct' });
                return;
            }
        }
    })
});

app.post('/api/addWorkHours', validateToken, (req, res) => {
    const { userId, name, date, project, start, end } = req.body;

    let sql = `INSERT INTO working_hours (userId, name, date, project, startTime, endTime) VALUES (${userId}, '${name}', '${date}', '${project}', '${start}', '${end}')`

    db.query(sql, (err, results) => {
        if (err) {
            res.status(401).json({ error: 'Error in Sql Querry or internal Error request Developer to restart the Node APP' });
        }
        res.json({ ok: true })
    })

});

app.get('/api/delete', validateToken, (req, res) => {
    let sql = `DELETE FROM working_hours WHERE id = ${req.query.id};`
    db.query(sql, (err, results) => {
        if (err) {
            res.status(401).json({ error: 'Error in Sql Querry or internal Error request Developer to restart the Node APP' });
        }
        res.json({ ok: true })
    })
})

app.post('/api/updateWorkHours', validateToken, (req, res) => {
    console.log(req.body)
    const { id, date, project, start, end } = req.body;

    let sql = `UPDATE working_hours SET date = '${date}', project = '${project}', startTime = '${start}', endTime = '${end}' WHERE id = ${id}`

    db.query(sql, (err, results) => {
        if (err) {
            res.status(401).json({ error: 'Error in Sql Querry or internal Error request Developer to restart the Node APP' });
        }
        res.json({ ok: true })
    })

});

app.get('/api/getWorkingHours', validateToken, (req, res) => {
    let sql = ""
    if (req.query.userId) {
        if (req.query.projectId !== '-1') {
            sql = `SELECT * FROM working_hours WHERE userId=${req.query.userId} AND project = ${req.query.projectId} AND YEAR(date) = YEAR(CURDATE()) AND MONTH(date) = ${req.query.monthId} ORDER BY date DESC;`
        } else {
            sql = `SELECT * FROM working_hours WHERE userId=${req.query.userId} AND YEAR(date) = YEAR(CURDATE()) AND MONTH(date) = ${req.query.monthId} ORDER BY date DESC;`
        }
    } else {
        console.log('Admin Access')
        if (req.query.submissionId) {
            if (req.query.projectId !== '-1') {
                sql = `SELECT * FROM working_hours WHERE project = ${req.query.projectId} AND submission_id = ${req.query.submissionId} AND YEAR(date) = YEAR(CURDATE()) AND MONTH(date) = ${req.query.monthId} ORDER BY date DESC;`
            } else {
                sql = `SELECT * FROM working_hours WHERE submission_id = ${req.query.submissionId} AND YEAR(date) = YEAR(CURDATE()) AND MONTH(date) = ${req.query.monthId} ORDER BY date DESC;`
            }
        }
    }
    db.query(sql, (err, results) => {
        if (err) {
            res.status(401).json({ error: 'Error in Sql Querry or internal Error request Developer to restart the Node APP' });
        } else {
            res.json({ ok: true, userHours: results })
        }
    })
})

app.post('/api/logout', validateToken, (req, res) => {
    const token = req.token

    const user = activeUsers.find((u) => u.token === token);

    const index = activeUsers.indexOf(user);

    if (index > -1) {
        activeUsers.splice(index, 1);
    }

    res.json({ ok: true });
});

app.get('/api/protected', validateToken, (req, res) => {
    res.json({ ok: true, message: 'This is a protected route' });
});

app.get('/api/getSubmission', validateToken, (req, res) => {
    let sql = ""
    if (req.query.userId) {
        if (req.query.status !== 'All') {
            sql = `SELECT * FROM work_submission WHERE userId = ${req.query.userId} AND status = '${req.query.status}' AND YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = ${req.query.monthId} ORDER BY created_at DESC`
        } else {
            sql = `SELECT * FROM work_submission WHERE userId = ${req.query.userId} AND YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = ${req.query.monthId} ORDER BY created_at DESC`
        }
    } else {
        if (req.query.status !== 'All') {
            sql = `SELECT * FROM work_submission WHERE status = '${req.query.status}' AND YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = ${req.query.monthId} ORDER BY created_at DESC`
        } else {
            sql = `SELECT * FROM work_submission WHERE YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = ${req.query.monthId} ORDER BY created_at DESC`
        }
    }
    db.query(sql, (err, results) => {
        if (err) {
            res.status(401).json({ error: 'Error in Sql Querry or internal Error request Developer to restart the Node APP' });
        }
        res.json({ ok: true, reports: results })
    })
})

app.get('/api/approve', validateToken, (req, res) => {
    var sql = ""
    if (req.query.userId && req.query.submissionId) {
        sql = `UPDATE working_hours SET status = 'Approved' WHERE submission_id = ${req.query.submissionId} AND userId = ${req.query.userId}`
    }
    db.query(sql, (err, results) => {
        if (err) {
            res.status(401).json({ error: 'Error in Sql Querry or internal Error request Developer to restart the Node APP' });
        }
        sql = `SELECT * FROM working_hours WHERE submission_id = ${req.query.submissionId} AND userId = ${req.query.userId} AND status = 'Submitted'`
        db.query(sql, (err, results) => {
            if (err) {
                res.status(401).json({ error: 'Error in Sql Querry or internal Error request Developer to restart the Node APP' });
            }
            if (results.length < 1) {
                sql = `UPDATE work_submission SET status = 'Approved', review_coments = '${req.query.reviews}' WHERE id = ${req.query.submissionId}`
                db.query(sql, (err, results) => {
                    if (err) {
                        res.status(401).json({ error: 'Error in Sql Querry or internal Error request Developer to restart the Node APP' });
                    }
                    res.json({ ok: true })
                })
            } else {
                res.json({ ok: true })
            }
        })
    })
})

app.get('/api/reject', validateToken, (req, res) => {
    var sql = ""
    if (req.query.userId && req.query.submissionId) {
        sql = `UPDATE working_hours SET status = '', submission_id = null WHERE submission_id = ${req.query.submissionId}`
        db.query(sql, (err, results) => {
            if (err) {
                res.status(401).json({ error: 'Error in Sql Querry or internal Error request Developer to restart the Node APP' });
            } else {
                sql = `DELETE FROM work_submission WHERE id = ${req.query.submissionId};`
                db.query(sql, (err, results) => {
                    if (err) {
                        res.status(401).json({ error: 'Error in Sql Querry or internal Error request Developer to restart the Node APP' });
                    } else {
                        res.json({ ok: true })
                    }
                })
            }
        })
    } else {
        res.status(401).json({ error: 'UserId or submissionId is missing' });
    }
})

app.get('/api/submit', validateToken, (req, res) => {
    console.log(req.query)
    let sql = `INSERT INTO work_submission (userId, status, userName) VALUES (${req.query.userId}, 'Submitted', '${req.query.userName}')`
    db.query(sql, (err, results) => {
        if (err) {
            res.status(401).json({ error: 'Error in Sql Querry or internal Error request Developer to restart the Node APP' });
        } else {
            if (results.insertId) {
                sql = `UPDATE working_hours SET submission_id = ${results.insertId}, status = 'Submitted' WHERE id IN (${req.query.work_ids});`
                db.query(sql, (err, results) => {
                    if (err) {
                        res.status(401).json({ error: 'Error in Sql Querry or internal Error request Developer to restart the Node APP' });
                    } else {
                        res.json({ ok: true })
                    }
                })

            }
        }
    })

})

app.listen(`${port}`, () => {
    console.log(`server started in a port ${port}`)
})

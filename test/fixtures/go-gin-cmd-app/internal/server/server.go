package server

import "github.com/gin-gonic/gin"

func Start() {
	router := gin.Default()
	router.GET("/", func(ctx *gin.Context) {
		ctx.String(200, "agent-ready")
	})
}

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/", () => "agent-ready");
app.Run();

terraform {
  required_version = ">= 1.6.0"
  required_providers { aws = { source = "hashicorp/aws", version = "~> 5.0" } }
}
provider "aws" { region = var.region, profile = var.profile }

resource "aws_vpc" "main" { cidr_block = "10.30.0.0/16" }
resource "aws_subnet" "public_a" { vpc_id = aws_vpc.main.id, cidr_block = "10.30.1.0/24", availability_zone = "${var.region}a", map_public_ip_on_launch = true }
resource "aws_subnet" "public_b" { vpc_id = aws_vpc.main.id, cidr_block = "10.30.2.0/24", availability_zone = "${var.region}b", map_public_ip_on_launch = true }
resource "aws_internet_gateway" "igw" { vpc_id = aws_vpc.main.id }
resource "aws_route_table" "public" { vpc_id = aws_vpc.main.id
  route { cidr_block = "0.0.0.0/0", gateway_id = aws_internet_gateway.igw.id }
}
resource "aws_route_table_association" "a" { subnet_id = aws_subnet.public_a.id, route_table_id = aws_route_table.public.id }
resource "aws_route_table_association" "b" { subnet_id = aws_subnet.public_b.id, route_table_id = aws_route_table.public.id }

resource "aws_s3_bucket" "media" { bucket = "${var.project}-media" }
resource "aws_s3_bucket" "aux_docs" { bucket = "${var.project}-aux-docs" }
resource "aws_s3_bucket" "enriched_emails" { bucket = "${var.project}-enriched-emails" }
resource "aws_s3_bucket" "ai_intelligence" { bucket = "${var.project}-ai-intelligence" }

resource "aws_cognito_user_pool" "pool" {
  name = "${var.project}-${var.env}-users"
  schema { name = "email"; attribute_data_type = "String"; required = true; mutable = false }
  auto_verified_attributes = ["email"]
}
resource "aws_cognito_user_pool_client" "app" {
  name = "${var.project}-${var.env}-web"
  user_pool_id = aws_cognito_user_pool.pool.id
  generate_secret = false
  allowed_oauth_flows = ["code"]
  allowed_oauth_scopes = ["email","openid","profile"]
  allowed_oauth_flows_user_pool_client = true
  callback_urls = ["http://localhost:3000/callback"]
}
output "cognito_user_pool_id" { value = aws_cognito_user_pool.pool.id }
output "cognito_app_client_id" { value = aws_cognito_user_pool_client.app.id }

resource "aws_ecs_cluster" "this" { name = "${var.project}-${var.env}-cluster" }
resource "aws_iam_role" "task" {
  name = "${var.project}-${var.env}-task"
  assume_role_policy = jsonencode({ Version="2012-10-17", Statement=[{ Effect="Allow", Principal={ Service="ecs-tasks.amazonaws.com" }, Action="sts:AssumeRole" }] })
}
resource "aws_iam_role_policy_attachment" "task_exec" {
  role = aws_iam_role.task.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}
resource "aws_iam_role_policy_attachment" "task_s3" {
  role = aws_iam_role.task.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3FullAccess"
}

resource "aws_lb" "alb" { name = "${var.project}-${var.env}-alb", load_balancer_type="application", subnets=[aws_subnet.public_a.id, aws_subnet.public_b.id] }
resource "aws_lb_target_group" "api" { name = "${var.project}-api", port=4000, protocol="HTTP", vpc_id=aws_vpc.main.id, target_type="ip", health_check { path="/health" } }
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.alb.arn
  port = 80
  protocol = "HTTP"
  default_action { type="forward", target_group_arn=aws_lb_target_group.api.arn }
}

resource "aws_ecs_task_definition" "api" {
  family = "${var.project}-${var.env}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode = "awsvpc"
  cpu = "512"
  memory = "1024"
  execution_role_arn = aws_iam_role.task.arn
  container_definitions = jsonencode([{
    name = "api",
    image = "public.ecr.aws/docker/library/node:20-alpine",
    essential = true,
    portMappings = [{ containerPort=4000, protocol="tcp" }],
    environment = [
      { name="API_PORT", value="4000" },
      { name="AGENT_URL", value="http://agent:4101/respond" },
      { name="OPENAI_API_KEY", value=var.openai_key },
      { name="PINECONE_API_KEY", value=var.pinecone_key },
      { name="PINECONE_INDEX", value=var.pinecone_index },
      { name="PINECONE_NAMESPACE", value=var.pinecone_namespace },
      { name="COGNITO_USER_POOL_ID", value=aws_cognito_user_pool.pool.id },
      { name="COGNITO_APP_CLIENT_ID", value=aws_cognito_user_pool_client.app.id }
    ]
  }])
}

resource "aws_security_group" "svc" {
  name = "${var.project}-${var.env}-svc"
  vpc_id = aws_vpc.main.id
  ingress { from_port=0, to_port=65535, protocol="tcp", cidr_blocks=["0.0.0.0/0"] }
  egress { from_port=0, to_port=0, protocol="-1", cidr_blocks=["0.0.0.0/0"] }
}

resource "aws_ecs_service" "api" {
  name = "${var.project}-${var.env}-api"
  cluster = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count = 1
  launch_type = "FARGATE"
  network_configuration { subnets=[aws_subnet.public_a.id, aws_subnet.public_b.id]; security_groups=[aws_security_group.svc.id]; assign_public_ip=true }
  load_balancer { target_group_arn = aws_lb_target_group.api.arn, container_name="api", container_port=4000 }
  depends_on = [aws_lb_listener.http]
}

resource "aws_db_subnet_group" "db" {
  name = "${var.project}-${var.env}-db-subnet"
  subnet_ids = [aws_subnet.public_a.id, aws_subnet.public_b.id]
}
resource "aws_db_instance" "pg" {
  count = var.enable_rds ? 1 : 0
  identifier = "${var.project}-${var.env}-pg"
  engine = "postgres"
  instance_class = "db.t4g.micro"
  allocated_storage = 20
  username = "ivylevel"
  password = var.db_password
  publicly_accessible = true
  skip_final_snapshot = true
  db_subnet_group_name = aws_db_subnet_group.db.name
  vpc_security_group_ids = [aws_security_group.svc.id]
}

output "alb_dns" { value = aws_lb.alb.dns_name }
output "rds_endpoint" { value = try(aws_db_instance.pg[0].address, "") }
